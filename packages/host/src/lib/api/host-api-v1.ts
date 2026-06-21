import { APIExpose, NextCallback, OpResponse, ParsedMessage, SequenceInfo, STHRestAPI } from "@scramjet/types";
import { corsMiddleware, DuplexStream, optionsMiddleware, roundRobinStrategy } from "@scramjet/api-server";
import { RouteDefinition, Router, RouterDefinition, registerHttpRoutes } from "@scramjet/api-router";
import { ObjLogger } from "@scramjet/obj-logger";
import { isStartSequenceEndpointPayloadDTO, onRequestDisconnect } from "@scramjet/utility";
import { z } from "zod";
import { IHost } from "../types";
import type { HostAPIV2Handler } from "./host-api-v2";

import { auditMiddleware, logger as auditMiddlewareLogger } from "../middlewares/audit";
import { Duplex, PassThrough } from "stream";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import TopicRouter from "../serviceDiscovery/topicRouter";
import { HostError, IDProvider } from "@scramjet/model";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { HostHeaders } from "@scramjet/symbols";
import { AuditedRequest } from "../auditor";
import {
    matchesRpcExposePath,
    normalizeRpcForwardPath,
    stripRpcExposePath
} from "../rpc-path";

export { matchesRpcExposePath, normalizeRpcForwardPath, stripRpcExposePath };

export class HostAPIV1Handler {
    logger: ObjLogger;
    topicRouter?: TopicRouter;

    constructor(
        private api: APIExpose,
        private host: IHost,
        private version: string,
        private build: string,
        private v2?: Pick<HostAPIV2Handler, "createHubRouter">
    ) {
        this.logger = new ObjLogger(this);
        this.logger.pipe(this.host.logger);
    }

    get apiBase() {
        return this.host.apiBase;
    }

    get instanceBase() {
        return this.host.instanceBase;
    }

    get heartBeatInterval() {
        return this.host.heartBeatInterval;
    }

    /**
     * Setting up handlers for general Host API endpoints:
     * - creating Sequence (passing stream with the compressed package)
     * - starting Instance (based on a given Sequence ID passed in the HTTP request body)
     * - getting Sequence details
     * - listing all Instances running on the CSH
     * - listing all Sequences saved on the CSH
     * - Instance
     */
    attach() {
        const host = this.host;

        this.api.use(`${this.apiBase}/:type/:id?/:op?`, auditMiddleware(this.host.auditor));

        auditMiddlewareLogger.pipe(this.logger);

        this.api.use("*", corsMiddleware);
        this.api.use("*", optionsMiddleware);

        this.api.upstream(`${this.apiBase}/audit`, async (req, res) => this.handleAuditRequest(req, res));

        this.api.downstream(`${this.apiBase}/sequence`, async (req) => this.handleNewSequence(req), { end: true });
        this.api.downstream(`${this.apiBase}/sequence/:id`, async (req) => this.handleUpdateSequence(req), {
            end: true,
            method: "put",
        });

        this.api.op("delete", `${this.apiBase}/sequence/:id`, (req: ParsedMessage) => this.handleDeleteSequence(req));

        this.api.op("post", `${this.apiBase}/sequence/:id/start`, async (req: ParsedMessage) => this.handleStartSequence(req));

        this.api.get(`${this.apiBase}/sequence/:id`, (req) => host.getSequence(req.params?.id));
        this.api.get(`${this.apiBase}/sequence/:id/instances`, (req) => host.getSequenceInstances(req.params?.id));
        this.api.get(`${this.apiBase}/sequences`, () => host.getSequences());
        this.api.get(`${this.apiBase}/instances`, () => host.getInstances());
        this.api.get(`${this.apiBase}/entities`, () => ({
            sequences: host.getSequences(),
            instances: host.getInstances()
        }));
        registerHttpRoutes(this.api, this.createV1CompatibilityRouter());

        this.topicRouter = new TopicRouter(this.logger, this.api, this.apiBase, host.serviceDiscovery);

        this.api.upstream(`${this.apiBase}/log`, () => host.commonLogsPipe.getOut());
        this.api.duplex(`${this.apiBase}/platform`, (duplex: Duplex, headers: IncomingHttpHeaders) => {
            return host.cpmConnector?.handleCommunicationRequest(duplex as unknown as DuplexStream, headers);
        });

        this.api.use(`${this.apiBase}/cpm`, (req, res) => this.spaceMiddleware(req, res));

        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req, res, next));

        this.api.use(`${this.apiBase}/rpc`, (req, res, next) => this.rpcMiddleware(req, res, next));
        this.api.forward(`${this.apiBase}/rpc`, [], this.createRPCForwarder());
    }

    createV1CompatibilityRouter(): RouterDefinition {
        const host = this.host;
        const objectResponse = z.object({}).passthrough();
        const v2Handler = (path: string) => this.v2HubRoute(path)?.handler;

        return Router.create({ basePath: this.apiBase })
            .route(Router.get("/load-check", {
                id: "host.v1.load-check",
                schemas: { response: z.unknown() },
                handler: () => host.loadCheck.getLoadCheck()
            }))
            .route(Router.get("/version", {
                id: "host.v1.version",
                schemas: {
                    response: z.object({
                        service: z.string(),
                        apiVersion: z.literal("v1"),
                        version: z.string(),
                        build: z.string()
                    })
                },
                handler: async (): Promise<STHRestAPI.GetVersionResponse> => ({
                    service: host.service,
                    apiVersion: "v1",
                    version: await this.v2Version(v2Handler("/version")),
                    build: this.build,
                })
            }))
            .route(Router.get("/config", {
                id: "host.v1.config",
                schemas: { response: objectResponse },
                handler: async () => {
                    const response = await v2Handler("/config")?.({} as never) as { config?: unknown } | undefined;

                    return response?.config ?? host.publicConfig;
                }
            }))
            .route(Router.get("/status", {
                id: "host.v1.status",
                schemas: { response: objectResponse },
                handler: async () => {
                    const response = await v2Handler("/status")?.({} as never) as { details?: unknown } | undefined;

                    return response?.details ?? host.getStatus();
                }
            }));
    }

    private v2HubRoute(path: string): RouteDefinition | undefined {
        return this.v2?.createHubRouter().definitions().find(route => route.method === "get" && route.path === path);
    }

    private async v2Version(handler: RouteDefinition["handler"] | undefined): Promise<string> {
        const response = await handler?.({} as never) as { version?: unknown } | undefined;

        return typeof response?.version === "string" ? response.version : this.version;
    }

    /**
     * Forwards RPC to the correct instances
     * @returns {Function} Function that forwards the request to the correct instance.
     */
    createRPCForwarder() {
        return async (req: IncomingMessage) => {
            const [instance] = roundRobinStrategy(req, this.host.instancesStore.getByExposePath(req.url!));

            const url = req.url!.slice(instance.expose?.path?.length || 0);

            this.logger.debug("RPC request", req.url, url, instance?.id, instance?.rpcUrl);

            return [instance?.rpcUrl, url] as [string, string];
        };
    }

    async rpcMiddleware(req: IncomingMessage, res: ServerResponse, next: NextCallback) {
        const rpcPath = req.url?.startsWith(`${this.apiBase}/rpc`)
            ? req.url.slice(`${this.apiBase}/rpc`.length) || "/"
            : req.url || "/";
        const [instance] = roundRobinStrategy(req, this.host.instancesStore.getByExposePath(rpcPath));
        const normalizedRpcPath = instance
            ? rpcPath
            : normalizeRpcForwardPath(rpcPath, "/api/v1", this.host.apiVersion);
        const [resolvedInstance] = instance
            ? [instance]
            : roundRobinStrategy(req, this.host.instancesStore.getByExposePath(normalizedRpcPath));

        if (!resolvedInstance?.forwardRpcRequest) {
            next();
            return;
        }

        const url = stripRpcExposePath(
            normalizeRpcForwardPath(rpcPath, resolvedInstance.expose?.path, this.host.apiVersion),
            resolvedInstance.expose?.path
        );

        if (await resolvedInstance.forwardRpcRequest(req, res, url)) {
            return;
        }

        next();
    }

    /**
     * Finds Instance with given id passed in request parameters and forwards request to Instance router.
     * Forwarded request's url is reduced by the Instance base path and Instance parameter.
     * For example: /api/instance/:id/log -> /log
     *
     * Ends response with 404 if Instance is not found.
     *
     * @param {Request} req Request object.
     * @param {ServerResponse} res Response object.
     * @param {NextCallback} next Function to call when request is not handled by Instance middleware.
     * @param {string} instanceBase Instance API base path used when rewriting the forwarded URL.
     * @returns {Middleware} Instance middleware.
     */
    instanceMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback, instanceBase = this.instanceBase, paramName = "id", routerProperty = "router") {
        const params = req.params;
        const instanceId = params?.[paramName];

        if (!params || !instanceId) {
            return next(new HostError("UNKNOWN_INSTANCE"));
        }

        const instance = this.host.instancesStore.getByNameOrId(instanceId);

        if (instance) {
            const router = (instance as any)[routerProperty];

            if (!router) {
                return next(new HostError("CONTROLLER_ERROR", "Instance controller doesn't provide API."));
            }

            req.url = req.url?.substring(instanceBase.length + 1 + String(instanceId).length);

            return router.lookup(req, res, next);
        }

        res.statusCode = StatusCodes.NOT_FOUND;
        res.write(JSON.stringify({ error: `Instance ${instanceId} not found` }));
        res.end();

        return next();
    }

    /**
     * Forward request to Manager the Host is connected to.
     * @param {ParsedMessage} req Request object.
     * @param {ServerResponse} res Response object.
     * @param {NextCallback} _next Function to call when request is not handled by Instance middleware.
     */
    spaceMiddleware(req: ParsedMessage, res: ServerResponse) {
        const url = req.url!.replace(`${this.apiBase}/cpm/api/v1/`, "");

        this.logger.debug("SPACE REQUEST", req.url, url, this.apiBase);

        const clientRequest = this.host.cpmConnector?.makeHttpRequestToCpm(req.method!, url, req.headers);

        if (clientRequest) {
            clientRequest.on("response", (response: IncomingMessage) => {
                response.on("end", () => {
                    this.logger.debug("Space response ended", url, response.statusCode);
                });

                res.writeHead(response.statusCode!, response.statusMessage || "", response.headers);

                response.pipe(res);
            }).on("error", (error) => {
                this.logger.warn("Error requesting CPM", req.method!, url, error);
                res.destroy(error);
            });

            clientRequest.flushHeaders();
            req.pipe(clientRequest);
        } else {
            res.statusCode = 404;
            res.end();
        }
    }

    /**
     * Handles delete Sequence request.
     * Removes Sequence from the store and sends notification to Manager if connected.
     * Note: If Instance is started from a given Sequence, Sequence can not be removed
     * and CONFLICT status code is returned.
     *
     * @param {ParsedMessage} req Request object.
     * @returns {Promise<STHRestAPI.DeleteSequenceResponse>} Promise resolving to operation result object.
     */
    async handleDeleteSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.DeleteSequenceResponse>> {
        if (!req.params?.id || typeof req.params.id !== "string") {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "Missing id parameter" };
        }

        const id = req.params.id;
        const force = req.headers[HostHeaders.SEQUENCE_FORCE_REMOVE];

        try {
            await this.host.deleteSequence(id, !!force && force !== "false");

            return { opStatus: ReasonPhrases.OK, id };
        } catch (e: unknown) {
            if (!(e instanceof HostError)) {
                return {
                    opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR,
                    error: `Error removing Sequence: ${e}`
                };
            }

            switch (e.code) {
                case "UNKNOWN_SEQUENCE":
                    return { opStatus: ReasonPhrases.NOT_FOUND, error: e.message };
                case "SEQUENCE_IN_USE":
                    return { opStatus: ReasonPhrases.CONFLICT, error: e.message };
                default:
                    return { opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR, error: e.message };
            }
        }
    }

    async handleAuditRequest(req: ParsedMessage, res: ServerResponse) {
        this.host.heartBeatInterval.ref();

        const ret = new PassThrough();
        const out = this.host.auditor.getOutputStream(req, res);

        out.pipe(ret);

        const unpipe = () => {
            this.host.heartBeatInterval.unref();
            out.unpipe(ret);
            ret.end();
        };

        onRequestDisconnect(req, unpipe);

        return ret;
    }

    async handleUpdateSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        req.params ||= {};

        if (!req.params.id || typeof req.params.id !== "string") {
            return { opStatus: ReasonPhrases.BAD_REQUEST, error: "missing id parameter" };
        }

        const id = req.params.id;
        const existingSequence: SequenceInfo | undefined = this.host.sequenceStore.getById(id);

        if (!existingSequence) {
            return { opStatus: ReasonPhrases.NOT_FOUND, error: `Sequence with id: ${id} not found` };
        }

        if (existingSequence.instances.length) {
            return { opStatus: ReasonPhrases.CONFLICT, error: "Can't update sequence with instances" };
        }

        this.logger.debug("Sequence Update", existingSequence.id);

        return this.handleIncomingSequence(req, id);
    }

    /**
     * Handles incoming Sequence.
     * Uses Sequence adapter to unpack and identify Sequence.
     * Notifies Manager (if connected) about new Sequence.
     *
     * @param {IncomingMessage} stream Stream of packaged Sequence.
     * @param {string} id Sequence id.
     * @returns {Promise} Promise resolving to operation result.
     */
    async handleNewSequence(stream: ParsedMessage, id = IDProvider.generate()):
        Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        const existingSequence = this.host.sequenceStore.getById(id);

        if (existingSequence) {
            this.logger.debug("Method not allowed", id, existingSequence.id);

            return {
                opStatus: ReasonPhrases.METHOD_NOT_ALLOWED,
                error: `Sequence with id ${id} already exist`
            };
        }

        return this.handleIncomingSequence(stream, id);
    }

    /**
     * Handles Sequence start request.
     * Parses request body for Sequence configuration and parameters to be passed to first Sequence method.
     * Passes obtained parameters to main method staring Sequence.
     *
     * Notifies Manager (if connected) about new Instance.
     *
     * @param {ParsedMessage} req Request object.
     * @returns {Promise<STHRestAPI.StartSequenceResponse>} Promise resolving to operation result object.
     */
    async handleStartSequence(req: ParsedMessage): Promise<OpResponse<STHRestAPI.StartSequenceResponse>> {
        if (!req.params?.id || typeof req.params.id !== "string") {
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: "Missing id parameter"
            };
        }

        const sequenceId = req.params.id;
        const payload = req.body || ({} as STHRestAPI.StartSequencePayload);

        try {
            isStartSequenceEndpointPayloadDTO(payload);
        } catch (error) {
            return {
                opStatus: ReasonPhrases.BAD_REQUEST,
                error: error instanceof Error ? error.message : "Invalid start sequence payload"
            };
        }

        if (payload.instanceId && (this.host.instancesStore.has(payload.instanceId) || this.host.instancesStore.hasReservedId(payload.instanceId))) {
            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Instance with a given ID already exists"
            };
        }

        if (payload.instanceId && this.host.instancesStore.hasName(payload.instanceId)) {
            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Instance ID conflicts with an existing instance name"
            };
        }

        if (payload.instanceName) {
            if (this.host.instancesStore.hasName(payload.instanceName)) {
                return {
                    opStatus: ReasonPhrases.CONFLICT,
                    error: "Instance with a given name already exists"
                };
            }

            if (this.host.instancesStore.has(payload.instanceName) || this.host.instancesStore.hasReservedId(payload.instanceName)) {
                return {
                    opStatus: ReasonPhrases.CONFLICT,
                    error: "Instance name conflicts with an existing instance ID"
                };
            }
        }

        try {
            const runner = await this.host.startSequence(sequenceId, payload);

            if (!runner) {
                throw new HostError("INSTANCE_STARTUP_ERROR", "Unexpected startup error");
            }
            if (!("id" in runner)) {
                throw new HostError("INSTANCE_STARTUP_ERROR", `Instance startup error with exitCode: ${runner?.exitcode}`);
            }

            this.host.auditor.auditInstanceStart(runner.id, req as AuditedRequest, runner.limits);

            return { opStatus: ReasonPhrases.OK, id: runner.id };
        } catch (e) {
            if (!(e instanceof HostError)) {
                return { opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR, error: (e as any)?.message || "Unknown Error" };
            }

            switch (e.code) {
                case "UNKNOWN_SEQUENCE":
                    return { opStatus: ReasonPhrases.NOT_FOUND, error: e.message };
                case "SEQUENCE_SELECTOR_CONFLICT":
                    return { opStatus: ReasonPhrases.CONFLICT, error: e.message };
                case "INSTANCE_ID_CONFLICT":
                    return { opStatus: ReasonPhrases.CONFLICT, error: e.message };
                case "INSTANCE_NAME_CONFLICT":
                    return { opStatus: ReasonPhrases.CONFLICT, error: e.message };
                case "INSTANCE_STARTUP_ERROR":
                    return { opStatus: ReasonPhrases.BAD_REQUEST, error: e.message };
                default:
                    return { opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR, error: e.message };
            }
        }
    }

    async handleIncomingSequence(
        req: ParsedMessage,
        id: string
    ): Promise<OpResponse<STHRestAPI.SendSequenceResponse>> {
        req.params ||= {};

        this.logger.info("New Sequence incoming", { id });

        try {
            const config = await this.host.addSequence(id, req, req.method !== "PUT", req.socket);

            return {
                id: config.id,
                opStatus: ReasonPhrases.OK,
            };
        } catch (error: any) {
            if (!(error instanceof HostError)) {
                return {
                    opStatus: ReasonPhrases.UNPROCESSABLE_ENTITY,
                    error,
                };
            }

            switch (error.code) {
                case "SEQUENCE_IDENTIFICATION_FAILED":
                    return {
                        opStatus: ReasonPhrases.BAD_REQUEST,
                        error: error.message,
                    };
                case "SEQUENCE_EXISTS":
                    return {
                        opStatus: ReasonPhrases.METHOD_NOT_ALLOWED,
                        error: error.message,
                    };
                default:
                    return {
                        opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR,
                        error: error.message,
                    };
            }
        }
    }
}
