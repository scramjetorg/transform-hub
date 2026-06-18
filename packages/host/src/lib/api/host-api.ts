import { APIExpose, NextCallback, OpResponse, ParsedMessage, SequenceInfo, STHRestAPI } from "@scramjet/types";
import { corsMiddleware, DuplexStream, optionsMiddleware, roundRobinStrategy } from "@scramjet/api-server";
import { Router, RouterDefinition, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { RestAPI2 } from "@scramjet/rest-api2";
import { ObjLogger } from "@scramjet/obj-logger";
import { isStartSequenceEndpointPayloadDTO } from "@scramjet/utility";
import { z } from "zod";
import { IHost } from "../types";

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

export class HostAPIHandler {
    logger: ObjLogger;
    topicRouter?: TopicRouter;

    constructor(
        private api: APIExpose,
        private host: IHost,
        private version: string,
        private build: string
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

    get v2ApiBase() {
        return replacePathVersion(this.apiBase, "v2");
    }

    get v2InstanceBase() {
        return replacePathVersion(this.instanceBase, "v2");
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

        this.attachV2Routes();
    }

    createV1CompatibilityRouter(): RouterDefinition {
        const host = this.host;
        const objectResponse = z.object({}).passthrough();

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
                handler: (): STHRestAPI.GetVersionResponse => ({
                    service: host.service,
                    apiVersion: "v1",
                    version: this.version,
                    build: this.build,
                })
            }))
            .route(Router.get("/config", {
                id: "host.v1.config",
                schemas: { response: objectResponse },
                handler: () => host.publicConfig
            }))
            .route(Router.get("/status", {
                id: "host.v1.status",
                schemas: { response: objectResponse },
                handler: () => host.getStatus()
            }));
    }

    createHubRouter(): RouterDefinition {
        const host = this.host;
        const objectResponse = z.object({}).passthrough();
        const listResponse = z.object({ items: z.array(z.unknown()) }).passthrough();

        return Router.create()
            .route(Router.get("/load", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.LoadResponse<RestAPI2.Hub> => ({
                    load: (host.loadCheck.getLoadCheck() as any)?.load ?? 0
                })
            }))
            .route(Router.get("/version", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.VersionResponse<RestAPI2.Hub> => ({
                    version: this.version
                })
            }))
            .route(Router.get("/config", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.ConfigResponse<RestAPI2.Hub> => ({
                    config: host.publicConfig
                })
            }))
            .route(Router.get("/status", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.StatusResponse => ({
                    status: "ok",
                    details: host.getStatus()
                })
            }))
            .route(Router.get("/sequences", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Sequence> => ({
                    items: (host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), status: sequence.status }))
                })
            }))
            .route(Router.get("/instances", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                    items: (host.getInstances() as any[]).map(instance => ({ id: String(instance.id), sequenceId: instance.sequenceId, status: instance.status }))
                })
            }))
            .route(Router.get("/entities", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Entity> => ({
                    items: [
                        ...(host.getSequences() as any[]).map(sequence => ({ id: String(sequence.id), type: "sequence" })),
                        ...(host.getInstances() as any[]).map(instance => ({ id: String(instance.id), type: "instance" }))
                    ]
                })
            }))
            .route(Router.get("/topics", {
                schemas: { response: listResponse },
                handler: (): RestAPI2.ListResponse<RestAPI2.Topic> => ({
                    items: ((host.serviceDiscovery as any)?.getTopics?.() || []).map((topic: any) => ({
                        name: String(topic.id?.() || topic.id || topic.name || topic)
                    }))
                })
            }))
            .route(Router.get("/logs", {
                kind: "upstream",
                schemas: { response: z.unknown() },
                handler: () => host.commonLogsPipe.getOut()
            }))
            .route(Router.get("/audit", {
                kind: "upstream",
                schemas: { response: z.unknown() }
            }));
    }

    createSequenceRouter(): RouterDefinition {
        const host = this.host;
        const objectResponse = z.object({}).passthrough();
        const listResponse = z.object({ items: z.array(z.unknown()) }).passthrough();
        const sequenceId = (params: unknown) => String((params as { sequenceId?: string } | undefined)?.sequenceId || "");

        return Router.create()
            .route(Router.route("post", "/", {
                kind: "downstream",
                schemas: { response: objectResponse }
            }))
            .route(Router.route("put", "/:sequenceId", {
                kind: "downstream",
                schemas: { response: objectResponse }
            }))
            .route(Router.route("delete", "/:sequenceId", {
                schemas: { response: objectResponse },
                handler: async ({ params, headers }): Promise<RestAPI2.OpResponse<RestAPI2.DeleteSequenceResponse>> => {
                    const id = sequenceId(params);
                    const response = await this.handleDeleteSequence({ params: { id }, headers } as unknown as ParsedMessage);

                    return this.toRestOperation(response, { sequenceId: id, deleted: response.opStatus === ReasonPhrases.OK });
                }
            }))
            .route(Router.post("/:sequenceId/instances", {
                schemas: { response: objectResponse },
                handler: async ({ params, body, headers }): Promise<RestAPI2.OpResponse<RestAPI2.StartSequenceResponse>> => {
                    const id = sequenceId(params);
                    const response = await this.handleStartSequence({ params: { id }, body, headers } as unknown as ParsedMessage);

                    return this.toRestOperation(response, { instance: { id: String((response as { id?: string }).id || "") } });
                }
            }))
            .route(Router.get("/:sequenceId", {
                schemas: { response: objectResponse },
                handler: ({ params }): RestAPI2.SequenceResponse => {
                    const id = sequenceId(params);
                    const sequence = host.getSequence(id) as any;

                    return { sequence: { id: String(sequence?.id || id), status: sequence?.status } };
                }
            }))
            .route(Router.get("/:sequenceId/instances", {
                schemas: { response: listResponse },
                handler: ({ params }): RestAPI2.ListResponse<RestAPI2.Instance> => ({
                    items: (host.getSequenceInstances(sequenceId(params)) as any[]).map(instance => ({
                        id: String(instance.id),
                        sequenceId: instance.sequenceId,
                        status: instance.status
                    }))
                })
            }));
    }

    createInstanceRouter(): RouterDefinition {
        const objectResponse = z.object({}).passthrough();
        const instanceId = (params: unknown) => String((params as { instanceId?: string } | undefined)?.instanceId || "");
        const resolveInstance = (params: unknown) => this.host.instancesStore.getByNameOrId(instanceId(params)) as any;

        return Router.create()
            .route(Router.get("/", {
                schemas: { response: objectResponse },
                handler: ({ params }): RestAPI2.InstanceResponse => {
                    const id = instanceId(params);
                    const instance = resolveInstance(params);
                    const info = instance?.getInfo?.() || instance || {};

                    return { instance: { id: String(info.id || id), sequenceId: info.sequenceId, status: info.status } };
                }
            }))
            .route(Router.route("delete", "/", {
                schemas: { response: objectResponse },
                handler: async ({ params, body }): Promise<RestAPI2.OpResponse<RestAPI2.DeleteInstanceResponse>> => {
                    const id = instanceId(params);
                    const payload = (body || { mode: "stop" }) as Partial<RestAPI2.DeleteInstancePayload>;
                    const instance = resolveInstance(params);

                    if (payload.mode === "kill") {
                        await instance?.kill?.({ removeImmediately: true });
                    } else {
                        await instance?.stop?.({ timeout: payload.timeout || 7000, canCallKeepalive: false });
                    }

                    return {
                        operation: { id, status: instance ? "completed" : "failed" },
                        result: instance ? { instanceId: id, mode: payload.mode || "stop", accepted: true } : undefined,
                        error: instance ? undefined : { code: "UNKNOWN_INSTANCE", message: `Instance ${id} not found` }
                    };
                }
            }))
            .route(Router.route("patch", "/", {
                schemas: { response: objectResponse },
                handler: async ({ params, body }): Promise<RestAPI2.OpResponse<RestAPI2.InstanceParametersResponse>> => {
                    const id = instanceId(params);
                    const patch = (body || {}) as RestAPI2.InstanceParametersPatch;
                    const instance = resolveInstance(params);

                    if (patch.parameters && instance?.set) {
                        await instance.set(patch.parameters);
                    }

                    return {
                        operation: { id, status: instance ? "completed" : "failed" },
                        result: instance ? { instance: { id }, parameters: patch.parameters || {} } : undefined,
                        error: instance ? undefined : { code: "UNKNOWN_INSTANCE", message: `Instance ${id} not found` }
                    };
                }
            }))
            .route(Router.get("/stdio", {
                schemas: { response: objectResponse },
                handler: (): RestAPI2.StdIODescriptorList => ({
                    channels: [
                        { fd: 0, readable: false, writable: true },
                        { fd: 1, readable: true, writable: false },
                        { fd: 2, readable: true, writable: false }
                    ]
                })
            }))
            .route(Router.route("post", "/rpc/*", {
                kind: "duplex",
                schemas: { response: objectResponse }
            }));
    }

    createV2Router(): RouterDefinition {
        return Router.create({ basePath: this.v2ApiBase })
            .mount("/", this.createHubRouter())
            .mount("/sequences", this.createSequenceRouter())
            .mount("/instances/:instanceId", this.createInstanceRouter());
    }

    attachV2Routes() {
        registerHttpRoutes(this.api, this.createV2Router());
        this.api.use(`${this.v2ApiBase}/instances/:instanceId`, (req, res, next) => this.instanceMiddleware(req, res, next, `${this.v2ApiBase}/instances`, "instanceId"));
        this.api.use(`${this.v2InstanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req, res, next, this.v2InstanceBase));
    }

    private toRestOperation<TOutput>(response: OpResponse<Record<string, unknown>>, result: TOutput): RestAPI2.OpResponse<TOutput> {
        const ok = response.opStatus === ReasonPhrases.OK || response.opStatus === ReasonPhrases.ACCEPTED;

        return {
            operation: {
                id: String((response as { id?: string }).id || response.opStatus),
                status: ok ? "completed" : "failed"
            },
            result: ok ? result : undefined,
            error: ok ? undefined : {
                code: String(response.opStatus || ReasonPhrases.INTERNAL_SERVER_ERROR),
                message: String((response as { error?: unknown }).error || response.opStatus)
            }
        };
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
    instanceMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback, instanceBase = this.instanceBase, paramName = "id") {
        const params = req.params;
        const instanceId = params?.[paramName];

        if (!params || !instanceId) {
            return next(new HostError("UNKNOWN_INSTANCE"));
        }

        const instance = this.host.instancesStore.getByNameOrId(instanceId);

        if (instance) {
            if (!instance.router) {
                return next(new HostError("CONTROLLER_ERROR", "Instance controller doesn't provide API."));
            }

            req.url = req.url?.substring(instanceBase.length + 1 + String(instanceId).length);

            return instance.router.lookup(req, res, next);
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

        req.socket.on("end", unpipe);
        req.socket.on("error", unpipe);

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
    // eslint-disable-next-line complexity
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
