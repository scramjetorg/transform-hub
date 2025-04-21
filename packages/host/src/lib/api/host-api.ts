import { APIExpose, NextCallback, OpResponse, ParsedMessage, SequenceInfo, STHRestAPI } from "@scramjet/types";
import { DuplexStream, roundRobinStrategy } from "@scramjet/api-server";
import { ObjLogger } from "@scramjet/obj-logger";

import { Host } from "../host";
import { corsMiddleware } from "../middlewares/cors";
import { optionsMiddleware } from "../middlewares/options";
import { auditMiddleware, logger as auditMiddlewareLogger } from "../middlewares/audit";
import { Duplex, PassThrough } from "stream";
import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import TopicRouter from "../serviceDiscovery/topicRouter";
import { HostError, IDProvider } from "@scramjet/model";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { HostHeaders } from "@scramjet/symbols";
import { AuditedRequest } from "../auditor";

export class HostAPIHandler {
    logger: ObjLogger;

    constructor(private api: APIExpose, private host: Host, private version: string, private build: string) {
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

        this.api.get(`${this.apiBase}/sequence/:id`, (req) => host.getSequence(req));
        this.api.get(`${this.apiBase}/sequence/:id/instances`, (req) => host.getSequenceInstances(req.params?.id));
        this.api.get(`${this.apiBase}/sequences`, () => host.getSequences());
        this.api.get(`${this.apiBase}/instances`, () => host.getInstances());
        this.api.get(`${this.apiBase}/entities`, () => ({
            sequences: host.getSequences(),
            instances: host.getInstances()
        }));
        this.api.get(`${this.apiBase}/load-check`, () => host.loadCheck.getLoadCheck());
        this.api.get(
            `${this.apiBase}/version`,
            (): STHRestAPI.GetVersionResponse => ({
                service: host.service,
                apiVersion: host.apiVersion,
                version: this.version,
                build: this.build,
            })
        );

        this.api.get(`${this.apiBase}/config`, () => host.publicConfig);
        this.api.get(`${this.apiBase}/status`, () => host.getStatus());

        const topicLogger = new TopicRouter(this.logger, this.api, this.apiBase, host.serviceDiscovery).logger;

        topicLogger.pipe(this.logger);

        this.api.upstream(`${this.apiBase}/log`, () => host.commonLogsPipe.getOut());
        this.api.duplex(`${this.apiBase}/platform`, (duplex: Duplex, headers: IncomingHttpHeaders) => {
            this.logger.debug("Platform request");
            return host.cpmConnector?.handleCommunicationRequest(duplex as unknown as DuplexStream, headers);
        });

        this.api.use(`${this.apiBase}/cpm`, (req, res) => this.spaceMiddleware(req, res));

        this.api.use(`${this.instanceBase}/:id`, (req, res, next) => this.instanceMiddleware(req, res, next));

        this.api.forward(`${this.apiBase}/rpc`, [], this.createRPCForwarder());
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
     * @returns {Middleware} Instance middleware.
     */
    instanceMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        const params = req.params;

        if (!params || !params.id) {
            return next(new HostError("UNKNOWN_INSTANCE"));
        }

        const instance = this.host.instancesStore.get(params.id);

        if (instance) {
            if (!instance.router) {
                return next(new HostError("CONTROLLER_ERROR", "Instance controller doesn't provide API."));
            }

            req.url = req.url?.substring(this.instanceBase.length + 1 + params.id.length);

            return instance.router.lookup(req, res, next);
        }

        res.statusCode = StatusCodes.NOT_FOUND;
        res.write(JSON.stringify({ error: `Instance ${params.id} not found` }));
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

        this.logger.info("SPACE REQUEST", req.url, url, this.apiBase);

        const clientRequest = this.host.cpmConnector?.makeHttpRequestToCpm(req.method!, url, req.headers);

        if (clientRequest) {
            clientRequest.on("response", (response: IncomingMessage) => {
                response.on("end", () => {
                    this.logger.info("Space response ended", url, response.statusCode);
                });

                res.writeHead(response.statusCode!, response.statusMessage || "", response.headers);

                response.pipe(res);
            }).on("error", (error) => {
                this.logger.error("Error requesting CPM", error);
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
        const sequenceId = req.params?.id as string;
        const payload = req.body || ({} as STHRestAPI.StartSequencePayload);

        if (this.host.instancesStore.has(payload.instanceId)) {
            return {
                opStatus: ReasonPhrases.CONFLICT,
                error: "Instance with a given ID already exists"
            };
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
                case "INSTANCE_ID_CONFLICT":
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
