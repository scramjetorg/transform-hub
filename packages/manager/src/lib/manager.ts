import findPackage from "find-package-json";
import { ReasonPhrases } from "http-status-codes";

import {
    APIRoute,
    IComponent,
    IObjectLogger,
    ParsedMessage,
    SequenceMessageData,
    ManagerConfiguration,
    MRestAPI,
    SequenceConfig,
    Instance,
    SpaceEventMessageData,
    LogLevel
} from "@scramjet/types";
import { ActorRole, ActorType, DisconnectReason, ISTHConnectionStore, ISTHController, ISTHInfoRegister } from "@scramjet/types";
import { CeroError, getRouter } from "@scramjet/api-server";
import { PassThrough, Readable } from "stream";
import { ClientRequest, IncomingHttpHeaders, IncomingMessage, ServerResponse, request } from "http";
import { InstanceStatus, SequenceMessageCode } from "@scramjet/symbols";

import { CommonLogsPipe } from "./common-logs-pipe";
import { IDProvider } from "@scramjet/model";
import { LoadCheck, LoadCheckConfig } from "@scramjet/load-check";
import { STHController } from "./sth-controller";
import { STHInfoRegister } from "./sth-info-register";
import { SthConnectionStore } from "./sth-connection-store";
import { getDefaultConfig } from "@scramjet/manager-config";
import { defer, merge, readJsonFile } from "@scramjet/utility";
import { ServiceDiscovery, TopicActor } from "./service-discovery";
import { ManagerSthBrokerTransport } from "./verser2-transport";

import { VerserConnection } from "@scramjet/verser";
import { ObjLogger } from "@scramjet/obj-logger";
import { HealthCheck } from "./health-check";
import { ManagerAuditor } from "./manager-auditor";

import { getS3Router } from "./s3-router";
import { Client as MinioClient } from "minio";
import * as fs from "fs/promises";
import { prepareDisconnectDroplist, translateDeleteError, translateDisconnectError, validateDisconnectRequest } from "./utils";
import { homedir } from "os";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";
const defaultLimit = 100;
const defaultOffset = 0;

export function normalizeForwardedHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [name, value] of Object.entries(headers)) {
        if (value === undefined) {
            continue;
        }

        normalized[name] = Array.isArray(value) ? value.join(", ") : value;
    }

    return normalized;
}

export class Manager implements IComponent {
    id: string;
    private _apiRouter: APIRoute;
    private s3Middleware!: Awaited<ReturnType<typeof getS3Router>>;
    private sthConnectionStore: ISTHConnectionStore = new SthConnectionStore();
    private serviceDiscovery: ServiceDiscovery = new ServiceDiscovery();
    private readonly _config: ManagerConfiguration = getDefaultConfig();
    private sthBrokerTransport?: ManagerSthBrokerTransport;

    private sthInfoRegister: ISTHInfoRegister = new STHInfoRegister();
    private commonLogsPipe = new CommonLogsPipe();
    private loadCheck: LoadCheck;
    private _startedPromise: Promise<void>;
    private startHandlers!: { res: Function; rej: Function };

    auditor: ManagerAuditor;

    logger: IObjectLogger;

    public get logStream(): Readable {
        return this.commonLogsPipe.getOut();
    }

    public get config(): ManagerConfiguration {
        return this._config;
    }

    public get router(): APIRoute {
        return this._apiRouter;
    }

    public setSthBrokerTransport(transport: ManagerSthBrokerTransport) {
        this.sthBrokerTransport = transport;
    }

    public getSthBrokerTransport(): ManagerSthBrokerTransport | undefined {
        return this.sthBrokerTransport;
    }

    public get service(): string {
        return name;
    }

    public get apiVersion(): string {
        const { apiBase } = this._config;
        const matchedVersion = apiBase.match(/\/(v\d+)\/?/);

        return matchedVersion && matchedVersion[1] ? matchedVersion[1] : "unknown";
    }

    public get version(): string {
        return version;
    }

    public get build(): string {
        return buildInfo.hash || "source";
    }

    public get startedPromise(): Promise<void> {
        return this._startedPromise;
    }

    s3Client?: MinioClient;

    constructor(_config?: ManagerConfiguration) {
        this._startedPromise = new Promise((res, rej) => {
            this.startHandlers = { res, rej };
        });
        this._apiRouter = getRouter();

        merge(this._config, _config || {});

        this.id = this._config.id;
        this.logger = new ObjLogger(this, { id: this.id });
        this.logger.logLevel = (this._config.logLevel || "info").toLocaleUpperCase() as LogLevel;

        this.logger.debug("Manager config: ", this._config);

        this.serviceDiscovery.logger.pipe(this.logger);

        this.loadCheck = new LoadCheck(
            new LoadCheckConfig({
                safeOperationLimit: 0,
                instanceRequirements: { cpuLoad: 0, freeSpace: 0, freeMem: 0 },
                fsPaths: [homedir()]
            })
        );

        this.sthInfoRegister.logger.pipe(this.logger);
        this.sthConnectionStore.logger.pipe(this.logger);
        this.auditor = new ManagerAuditor(this.sthConnectionStore, this.id);

        this.commonLogsPipe.logger.pipe(this.logger);

        if (this.config.s3 && this.config.s3.endPoint) {
            this.logger.info("Config", this.config.s3);
            this.s3Client = new MinioClient({
                region: this.config.s3.region,
                endPoint: this.config.s3.endPoint,
                accessKey: this.config.s3.accessKey!,
                secretKey: this.config.s3.secretKey!,
                useSSL: this.config.s3.useSSL,
                port: this.config.s3.port,
            });
        } else {
            this.logger.info("No s3 configuration found, falling back to disk.");
        }
    }

    async main() {
        await fs.mkdir(`/tmp/manager/${this.id}`, { recursive: true });

        this.logger.addOutput(this.commonLogsPipe.getIn());

        await this.attachManagerAPIs();

        this.logger.trace("Manager main called.");

        this.startHandlers.res();
    }

    async attachManagerAPIs() {
        const { apiBase } = this._config;

        this._apiRouter.get(`${apiBase}/sth/:id/info`, (req: ParsedMessage): MRestAPI.GetHostInfoResponse => {
            const sth = this.sthConnectionStore.getById(req.params?.id);

            if (!sth) {
                throw new CeroError("ERR_NOT_FOUND");
            }

            return sth.getInfo();
        });

        this._apiRouter.get(
            `${apiBase}/version`,
            (): MRestAPI.GetVersionResponse => ({
                service: this.service,
                apiVersion: this.apiVersion,
                version,
                build: this.build,
            })
        );

        this._apiRouter.get(`${apiBase}/config`, (): MRestAPI.GetConfigResponse => ({ config: this.config }));
        this._apiRouter.get(`${apiBase}/list`, (req:ParsedMessage): MRestAPI.GetListResponse => {
            let offset = req.query && req.query.offset ? parseInt(req.query.offset, 10) : defaultOffset;
            let limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : defaultLimit;

            if (!this.validateQueries(offset, limit)) {
                offset = defaultOffset;
                limit = defaultLimit;
            }

            return this.getList(offset, limit);
        });
        this._apiRouter.get(`${apiBase}/instances`, (req:ParsedMessage): MRestAPI.GetInstancesResponse => {
            let offset = req.query && req.query.offset ? parseInt(req.query.offset, 10) : defaultOffset;
            let limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : defaultLimit;

            if (!this.validateQueries(offset, limit)) {
                offset = defaultOffset;
                limit = defaultLimit;
            }

            return this.getInstances(offset, limit);
        });
        this._apiRouter.get(`${apiBase}/sequences`, (): MRestAPI.GetSequenceIDSResponse => this.getSequencesIds());
        this._apiRouter.get(`${apiBase}/all_sequences`, (req:ParsedMessage): MRestAPI.GetSequencesResponse => {
            let offset = req.query && req.query.offset ? parseInt(req.query.offset, 10) : defaultOffset;
            let limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) : defaultLimit;

            if (!this.validateQueries(offset, limit)) {
                offset = defaultOffset;
                limit = defaultLimit;
            }

            return this.getSequences(offset, limit);
        });
        this._apiRouter.get(`${apiBase}/entities`, (): MRestAPI.GetEntitiesResponse => this.getEntities());
        this._apiRouter.get(`${apiBase}/topics`, (): MRestAPI.GetTopicsResponse => this.serviceDiscovery.list());
        this._apiRouter.get(`${apiBase}/load`, (): Promise<MRestAPI.GetLoadResponse> => this.loadCheck.getLoadCheck());

        this._apiRouter.upstream(`${apiBase}/log`, () => this.commonLogsPipe.getOut());
        this._apiRouter.upstream(`${apiBase}/load-stream`, () => this.loadCheck.getLoadCheckStream());

        this._apiRouter.upstream(`${apiBase}/topic/:name`, (req: ParsedMessage, res: ServerResponse) => {
            return this.handleTopicUpstreamRequest(req, res);
        });

        this._apiRouter.downstream(
            `${apiBase}/topic/:name`,
            async (req, res) => {
                return this.handleTopicDownstreamRequest(req, res);
            },
            { checkContentType: false, end: false }
        );

        this._apiRouter.op("delete", `${apiBase}/store`, async (): Promise<MRestAPI.StoreClearResponse> => {
            try {
                await this.s3Middleware.clearIndex();
                return { opStatus: ReasonPhrases.ACCEPTED };
            } catch (err: any) {
                return {
                    opStatus: ReasonPhrases.NOT_FOUND,
                    error: err.message
                };
            }
        });

        this._apiRouter.op("delete", `${apiBase}/sth/:id`, async (req: ParsedMessage): Promise<MRestAPI.HubDeleteResponse> => {
            req.params ||= {};

            const id = req.params.id;
            const force = req.headers["x-force"] === "true";

            if (!id) {
                return {
                    opStatus: ReasonPhrases.NOT_FOUND,
                    error: "Id was not supplied"
                };
            }

            this.logger.debug("Received delete request", { id, force });

            try {
                await this.sthConnectionStore.delete(id, force);
            } catch (e: any){
                return translateDeleteError(e);
            }
            return {
                opStatus: ReasonPhrases.ACCEPTED,
            };
        });
        this._apiRouter.use(`${apiBase}/sth/:id`, (req, res, _next) => this.handleRequestToSTH(req, res));

        if (this.config.s3) {
            this.s3Middleware = await getS3Router(this.s3Client, {
                base: `${apiBase}/s3`,
                id: this.id,
                bucket: this.config.s3.bucket!,
                bucketLimit: this.config.s3.bucketLimit
            });

            this.s3Middleware.logger.pipe(this.logger);

            await this.s3Middleware.loadIndex();

            this._apiRouter.use(`${apiBase}/s3/`, (req, res, next) => this.s3Middleware.router.lookup(req, res, next));
        }

        this._apiRouter.op("post", `${apiBase}/disconnect`, async (req: IncomingMessage): Promise<MRestAPI.PostDisconnectResponse> => {
            // eslint-disable-next-line no-extra-parens
            const payload = (req as IncomingMessage & { body: MRestAPI.PostDisconnectPayload }).body || {};

            this.logger.debug("Received disconnect request", payload);
            const requestInvalid = validateDisconnectRequest(payload, this.sthConnectionStore);

            if (requestInvalid === 0 || requestInvalid !== undefined) {
                return translateDisconnectError(requestInvalid);
            }
            const dropList = prepareDisconnectDroplist(payload, this.sthConnectionStore);

            dropList.forEach(drop => {
                this.logger.info("dropping", drop.sthController.id, drop.reason);
                drop.sthController.disconnect(drop.reason);
            });

            return {
                opStatus: ReasonPhrases.ACCEPTED,
                managerId: this.id,
                disconnected: dropList.map(elem => ({
                    sthId: elem.sthController.id,
                    reason: elem.reason
                }))
            };
        });
    }

    setupHealthEndpoint(healthCheck: HealthCheck) {
        // We may need some additional logic here later.
        this._apiRouter.get(`${this._config.apiBase}/health`, () => healthCheck.getHealthCheckInfo());
    }

    handleTopicUpstreamRequest(req: ParsedMessage, _res: ServerResponse) {
        const ps = new PassThrough({ emitClose: true });
        const params = req.params || {};
        // eslint-disable-next-line no-extra-parens
        const contentType = ((req.headers || {}).contentType as string) || "";

        this.logger.debug("GET topic ", req.url);

        const topicActor = new TopicActor(params.name, ActorRole.CONSUMER, ActorType.API, contentType, undefined);

        topicActor.addStream(ps);

        this.serviceDiscovery.register(topicActor, { contentType });

        req
            .on("close", () => {
                topicActor.retired = true;
                ps.end();
                this.serviceDiscovery.onUpdate("upstream close");
            })
            .on("error", e => {
                ps.emit("error", e);
            });

        return ps;
    }

    async handleTopicDownstreamRequest(req: ParsedMessage, res: ServerResponse) {
        const ps = new PassThrough({ emitClose: true });

        try {
            const params = req.params || {};
            const contentType = req.headers["content-type"] || "application/x-ndjson";
            const topicActor = new TopicActor(params.name, ActorRole.PROVIDER, ActorType.API, contentType, undefined);

            this.logger.debug("Topic downstream request", req.method, params.name, req.url);
            topicActor.addStream(ps);
            this.serviceDiscovery.register(topicActor, { contentType });

            req.on("close", () => {
                ps.on("drain", () => {
                    topicActor.retired = true;
                    this.serviceDiscovery.onUpdate("downstream close");
                });
                ps.end();
            });

            this.logger.debug("Topic downstream request registered", params.name);
        } catch (e) {
            this.logger.error("Error handling topic downstream request", e);
            res.statusCode = 500;
            res.end();
        }

        return ps;
    }

    async handleHostConnection(id: string, verserConnection: VerserConnection) {
        this.logger.info("STH Api. Incoming connection.");

        if (id && this.sthConnectionStore.getById(id)?.isConnectionActive) {
            await defer(100); // Wait for 100 ms before responding, so that a prevous connection can be closed.

            if (this.sthConnectionStore.getById(id)?.isConnectionActive) {
                this.logger.warn(`Refusing STH connection. STH with ${id} already connected.`);
                verserConnection.end(409, "Conflict");

                return;
            }
        }

        verserConnection.respond(202);

        let sth: ISTHController | undefined;

        if (typeof id === "string" && id.trim().length) {
            sth = this.sthConnectionStore.getById(id);

            if (sth) {
                sth.logger.unpipe(this.logger);
                sth.dispose();

                this.logger.info("STH re-connecting, id:", id);
                sth = new STHController(id, verserConnection);

                sth.logger.pipe(this.logger, { end: false });

                this.sthInfoRegister.clearHostEntities(sth.id);
                this.sthConnectionStore.add(sth);
                this.commonLogsPipe.removeInStream(sth.id);

                await sth.init();
                this.attachSTHEventHandlers(sth);
            } else {
                this.logger.info("Unknown STH providing id:", id);

                sth = new STHController(id, verserConnection);

                sth.logger.pipe(this.logger, { end: false });

                this.sthConnectionStore.add(sth);
                this.sthInfoRegister.addHub(sth.id);

                await sth.init();
                this.attachSTHEventHandlers(sth);
            }
        } else {
            sth = new STHController(IDProvider.generate(), verserConnection);
            sth.logger.pipe(this.logger);

            await sth.init();

            this.logger.info("New STH connected", sth.id);

            this.sthConnectionStore.add(sth);
            this.sthInfoRegister.addHub(sth.id);

            sth.sendId();

            this.attachSTHEventHandlers(sth);
        }

        this.commonLogsPipe.addInStream(sth.id, sth.logStream!);

        this.auditor.hubConnectionChange(sth.id, true);
        //sth.logStream!.pipe(this.logger);

        await this.auditor.onUpdate();
    }

    async handleHostDisconnect(id: string, reason: DisconnectReason) {
        const sth = this.sthConnectionStore.getById(id);
        if (!sth) {
            this.logger.warn("STH disconnect request for unknown STH", id);
            return;
        }
        sth.healthy = false;
        sth.disconnectReason = reason;

        this.logger.info("STH disconnecting", id, reason);
    }

    async handleRequestToSTH(req: ParsedMessage, res: ServerResponse) {
        const params = req.params || {};
        const sth = this.sthConnectionStore.getById(params.id);

        if (!sth) {
            this.logger.error("Request to STH Not Found", req.method, req.url);
            res.writeHead(404);
            res.end();

            return;
        }

        if (!sth.isConnectionActive) {
            this.logger.warn("Request to unhealthy hub", req.method, req.url);
            res.writeHead(503);
            res.end();

            return;
        }

        req.url = req?.url?.replace(`${this._config.apiBase}/sth/${params?.id}`, "");

        this.logger.debug("Request to STH", req.method, req.url, this._config.apiBase);

        let hostResponse: IncomingMessage | null = null;
        let requestToHost: ClientRequest | null = null;
        let disconnectCalled = false;

        const disconnect = (reason: string) => {
            if (!disconnectCalled) {
                this.logger.warn("Disconnecting forwarded request", req.url, reason);

                hostResponse?.unpipe(res);

                res.end();
                req.unpipe(requestToHost!);

                requestToHost?.end();
                requestToHost?.destroy();
            }

            disconnectCalled = true;
        };

        const headers = normalizeForwardedHeaders(req.headers);
        const expectsContinue = headers.expect?.toLowerCase() === "100-continue";

        if (expectsContinue) {
            delete headers.expect;
            res.writeContinue();
        }

        requestToHost = request({
            headers,
            method: req.method,
            path: req.url,
            agent: sth.verserConnection.getAgent()
        })
            .on("error", (error: Error) => {
                this.logger.warn("M -> STH Request error", { id: sth.id, url: req.url, error });
                disconnect("error");
            })
            .on("continue", () => {
                if (!expectsContinue) {
                    res.writeContinue();
                }
                req.resume();
            })
            .on("response", (response) => {
                hostResponse = response;

                this.logger.debug("Response from STH", hostResponse.url, hostResponse.statusCode);

                res.writeHead(response.statusCode!, response.statusMessage, response.headers);
                res.flushHeaders();
                response.pipe(res);
            });

        req.socket.on("close", () => {
            if (!res.writableFinished || !req.readableEnded) {
                disconnect("Request aborted");
            }
        });

        requestToHost.flushHeaders();
        req.pipe(requestToHost);

        requestToHost.setTimeout(0);
    }

    attachSTHEventHandlers(sth: ISTHController) {
        sth.on("event", (event: SpaceEventMessageData) => {
            this.sthConnectionStore.forEach((id, controller) => {
                if (!controller.isConnectionActive) return;
                if (id !== event.sourceHost) {
                    controller.sendEvent(event).catch((err: Error) => {
                        this.logger.warn("Error sending event to STH", id, err.message)
                    });
                }
            });
        });
        sth.on("sequence", (sequence: SequenceMessageData) => {
            this.logger.debug("Sequence event", sequence);

            switch (sequence.status) {
                case SequenceMessageCode.SEQUENCE_CREATED:
                    this.logger.debug("Adding sequence to sthInfoRegister", sth.id, sequence.id);
                    this.sthInfoRegister.addSequence(sth.id, sequence.id, sequence.config);

                    break;
                case SequenceMessageCode.SEQUENCE_DELETED:
                    this.sthInfoRegister.deleteSequence(sth.id, sequence.id);

                    break;
                default:
                    break;
            }
        });

        sth.on("instance", ({ status, ...msg }) => {
            this.logger.debug("Instance event", msg, status);

            if (!msg.instance) {
                this.logger.warn("Instance event without instance", msg);
                return;
            }

            switch (msg.instance.status) {
                case InstanceStatus.GONE:
                    this.sthInfoRegister.deleteInstance(sth.id, msg.instance.sequence?.id, msg.instance.id);

                    break;
                default:
                    this.sthInfoRegister.addInstance(sth.id, msg.instance as Instance);
                    break;
            }
        });

        sth.on("topic", (topicData) => {
            this.logger.trace("STH topic", topicData);

            const topicName = topicData.topicName;

            if (topicData.status === "add") {
                const role = topicData.localProvider || topicData.provides ? ActorRole.PROVIDER : ActorRole.CONSUMER;

                this.logger.debug("Registering host topic", { name: topicName, role, hostId: sth.id }, topicData.contentType);
                this.serviceDiscovery.register(
                    new TopicActor(topicName, role, ActorType.HOST, topicData.contentType, sth),
                    { contentType: topicData.contentType }
                );
            } else if (topicData.status === "remove") {
                const topic = this.serviceDiscovery.topics.get(topicName);
                const hostActor = topic?.actors.find(actor => actor.host?.id === sth.id);

                if (hostActor) {
                    this.serviceDiscovery.unregister(hostActor);
                }
            }
        });

        sth.on("disconnected", () => {
            this.sthInfoRegister.handleHubDisconnect(sth.id);
            this.auditor.hubConnectionChange(sth.id, false);
            this.serviceDiscovery.onUpdate("hub disconnect");
        });
    }

    mapConfig(input: SequenceConfig): MRestAPI.GetSequenceResponse {
        const output: MRestAPI.GetSequenceResponse = {
            id: input.id,
            config: input,
            location: "store",
            instances : []
        };

        return output;
    }

    validateQueries(offset: number, limit: number): boolean {
        const minOffset = 0;
        const minLimit = 1;
        const maxLimit = 100;

        if (offset < minOffset) {
            return false;
        }

        if (limit < minLimit || limit > maxLimit) {
            return false;
        }

        return true;
    }

    getList(offset = defaultOffset, limit = defaultLimit) {
        const topics = this.serviceDiscovery.list().slice(offset, offset + limit);
        const hubs = this.sthConnectionStore.getSTHControllersInfo().slice(offset, offset + limit);
        const response = hubs.sort((a, b) => {
            const aVal = a.isConnectionActive ? 10 : 0 + (a.healthy ? 1 : 0);
            const bVal = b.isConnectionActive ? 10 : 0 + (b.healthy ? 1 : 0);
            return bVal - aVal;
        }).map(hub => {
            return {
                id : hub.id,
                info: hub.info,
                healthy : hub.healthy,
                selfHosted: hub.selfHosted,
                isConnectionActive: hub.isConnectionActive,
                description: hub.description,
                tags: hub.tags,
                disconnectReason: hub.disconnectReason,
                topics: topics
                    .filter((topic) => topic.actors.some((actor) => actor.hostId === hub.id))
                    .map((topic) => topic.name),
                sequences: this.sthInfoRegister.getSequencesByHub(hub.id),
                instances: this.sthInfoRegister.getInstancesByHub(hub.id),
            };
        });

        return response;
    }

    getSequencesIds(){
        return this.sthInfoRegister
            .getHubs()
            .map((host) => this.sthInfoRegister.getSequencesByHub(host))
            .reduce((prev, curr) => prev.concat(curr), []);
    }

    getSequences(offset = defaultOffset, limit = defaultLimit){
        const sthSequences = this.sthInfoRegister.getSequences() as MRestAPI.GetSequenceResponse[];
        const storeSequences = this.s3Middleware.index.sequences;
        const allSequences = storeSequences.map(this.mapConfig).concat(sthSequences);

        return allSequences.slice(offset, offset + limit);
    }

    getInstances(offset = defaultOffset, limit = defaultLimit) {
        const instances = this.sthInfoRegister.getInstances();

        return instances.slice(offset, offset + limit);
    }

    getEntities() {
        const hubs = this.sthInfoRegister.getHubs();
        const topics = this.serviceDiscovery.list().map(topic => topic.name);
        const sequences = this.getSequences().map(seq => seq.id);
        const instances = this.getInstances().map(inst => inst.id);

        return {
            topics : topics,
            hubs : hubs,
            sequences : sequences,
            instances : instances
        };
    }

    async stop() {
        this.logger.info("Stopping manager...");
        this.logger.info("Manager stopped successfully.");
    }

}
