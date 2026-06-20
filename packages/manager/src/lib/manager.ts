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
    InstanceMessageData,
    SpaceEventMessageData,
    LogLevel,
    ActorRole,
    ActorType,
    DisconnectReason,
    ISTHConnectionStore,
    ISTHController,
    ISTHInfoRegister
} from "@scramjet/types";
import { CeroError, getRouter, normalizeForwardedHeaders as normalizeApiForwardedHeaders } from "@scramjet/api-server";
import { Router, registerHttpRoutes, replacePathVersion } from "@scramjet/api-router";
import { RestAPI2, healthCheckInfo, Space as RestAPI2SpaceSchema } from "@scramjet/rest-api2";
import { z } from "zod";
import { PassThrough, Readable } from "stream";
import { ServerResponse } from "http";
import { InstanceStatus, SequenceMessageCode } from "@scramjet/symbols";

import { CommonLogsPipe } from "./common-logs-pipe";
import { IDProvider } from "@scramjet/model";
import { LoadCheck, LoadCheckConfig, createDefaultHealthComponents, summarizeHealth } from "@scramjet/load-check";
import { STHController } from "./sth-controller";
import { STHInfoRegister } from "./sth-info-register";
import { SthConnectionStore } from "./sth-connection-store";
import { getDefaultConfig } from "@scramjet/manager-config";
import { defer, merge, readJsonFile } from "@scramjet/utility";
import { ServiceDiscovery, TopicActor } from "./service-discovery";
import { ManagerSthBrokerTransport } from "./verser2-transport";
import { classifyManagerRoute, ManagerRouteDecision, prepareManagerFollowForwarding } from "./route-classifier";
import { managerVerser2Options, maskConfig } from "@scramjet/config";

import { ObjLogger } from "@scramjet/obj-logger";
import { HealthCheck } from "./health-check";
import { ManagerAuditor } from "./manager-auditor";

import { getS3Router } from "./s3-router";
import { Client as MinioClient } from "minio";
import * as fs from "fs/promises";
import { homedir } from "os";
import { ManagerAPIHandler } from "./api/manager-api";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";
const defaultLimit = 100;
const defaultOffset = 0;

export type SthRegistrationPayload = {
    id?: string;
    routeDomain?: string;
    enrollmentToken?: string;
    accessKey?: string;
    description?: string;
    tags?: string[];
};

export const normalizeForwardedHeaders = normalizeApiForwardedHeaders;

export function maskManagerConfig(config: ManagerConfiguration): ManagerConfiguration {
    const safe = {} as ManagerConfiguration;

    merge(safe, config);

    if (safe.s3) {
        if (safe.s3.accessKey) safe.s3.accessKey = "********";
        if (safe.s3.secretKey) safe.s3.secretKey = "********";
    }

    return maskConfig(safe, managerVerser2Options) as ManagerConfiguration;
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

    public get publicConfig(): ManagerConfiguration {
        return maskManagerConfig(this._config);
    }

    public get router(): APIRoute {
        return this._apiRouter;
    }

    public get apiSthConnectionStore(): ISTHConnectionStore {
        return this.sthConnectionStore;
    }

    public get apiServiceDiscovery(): ServiceDiscovery {
        return this.serviceDiscovery;
    }

    public get apiCommonLogsPipe(): CommonLogsPipe {
        return this.commonLogsPipe;
    }

    public get apiLoadCheck(): LoadCheck {
        return this.loadCheck;
    }

    public get apiS3Middleware(): Awaited<ReturnType<typeof getS3Router>> {
        return this.s3Middleware;
    }

    public set apiS3Middleware(s3Middleware: Awaited<ReturnType<typeof getS3Router>>) {
        this.s3Middleware = s3Middleware;
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

        this.logger.debug("Manager config: ", this.publicConfig);

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
            this.logger.info("Config", this.publicConfig.s3);
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
        await new ManagerAPIHandler(this).attach();
    }

    setupHealthEndpoint(healthCheck: HealthCheck) {
        // We may need some additional logic here later.
        const toV2HealthCheckInfo = async (info: MRestAPI.HealthCheckInfo): Promise<RestAPI2.HealthCheckInfo<RestAPI2.Space>> => {
            const managerList = typeof this.getList === "function" ? this.getList() : [];
            const scope = { id: this.id || this._config.id, hubs: managerList.length };
            const currentHealthy = Object.values(info.modules || {}).every(Boolean);
            const components = await createDefaultHealthComponents({
                current: { name: "manager", healthy: currentHealthy, scope, details: info },
                processMemoryLimitBytes: this.loadCheck?.constants?.SAFE_OPERATION_LIMIT || undefined,
                osDiskPaths: this.loadCheck?.config?.fsPaths
            });

            return summarizeHealth(scope, components, info);
        };
        const createV1HealthRouter = () => Router.create({ basePath: this._config.apiBase }).route(Router.get("/health", {
            id: "manager.v1.health",
            schemas: { response: z.object({}).passthrough() },
            handler: () => healthCheck.getHealthCheckInfo()
        }));
        const createV2HealthRouter = () => Router.create({ basePath: replacePathVersion(this._config.apiBase, "v2") }).route(Router.get("/health", {
            id: "space.v2.health",
            schemas: { response: healthCheckInfo(RestAPI2SpaceSchema) },
            handler: (): Promise<RestAPI2.HealthCheckInfo<RestAPI2.Space>> => toV2HealthCheckInfo(healthCheck.getHealthCheckInfo())
        }));

        registerHttpRoutes(this._apiRouter, createV1HealthRouter());
        registerHttpRoutes(this._apiRouter, createV2HealthRouter());
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

    async handleSthRegistration(payload: SthRegistrationPayload): Promise<string> {
        this.logger.info("STH Api. Incoming verser2 registration.");

        if (!this.sthBrokerTransport) {
            throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
        }

        const id = typeof payload.id === "string" && payload.id.trim().length ? payload.id : IDProvider.generate();
        const routeDomain = typeof payload.routeDomain === "string" && payload.routeDomain.trim().length
            ? payload.routeDomain
            : this.getSthRouteDomain(id);
        const registrationToken = this.config.verser2.registration.token;

        if (registrationToken && payload.enrollmentToken !== registrationToken) {
            this.logger.warn("Refusing STH registration with invalid verser2 enrollment token", id);
            throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
        }

        if (id && this.sthConnectionStore.getById(id)?.isConnectionActive) {
            await defer(100); // Wait for 100 ms before responding, so that a prevous connection can be closed.

            if (this.sthConnectionStore.getById(id)?.isConnectionActive) {
                this.logger.warn(`Refusing STH connection. STH with ${id} already connected.`);
                throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
            }
        }

        const previousSth = this.sthConnectionStore.getById(id);
        let sth: ISTHController | undefined = previousSth;

        if (sth) {
            sth.logger.unpipe(this.logger);
            sth.dispose();

            this.logger.info("STH re-registering, id:", id);
            sth = new STHController(id, {
                brokerTransport: this.sthBrokerTransport,
                routeDomain,
                accessKey: payload.accessKey,
                description: payload.description,
                tags: payload.tags
            });

            sth.logger.pipe(this.logger, { end: false });

            this.sthInfoRegister.clearHostEntities(sth.id);
            this.sthInfoRegister.addHub(sth.id);
            this.sthConnectionStore.add(sth);
            this.attachSTHEventHandlers(sth);
            this.commonLogsPipe.removeInStream(sth.id);

            try {
                await sth.init();
            } catch (error) {
                this.rollbackFailedSthRegistration(sth);
                throw error;
            }
        } else {
            this.logger.info("New STH registered", id);
            sth = new STHController(id, {
                brokerTransport: this.sthBrokerTransport,
                routeDomain,
                accessKey: payload.accessKey,
                description: payload.description,
                tags: payload.tags
            });
            sth.logger.pipe(this.logger, { end: false });

            this.sthConnectionStore.add(sth);
            this.sthInfoRegister.addHub(sth.id);
            this.attachSTHEventHandlers(sth);

            try {
                await sth.init();
            } catch (error) {
                this.rollbackFailedSthRegistration(sth);
                throw error;
            }
        }

        this.commonLogsPipe.addInStream(sth.id, sth.logStream!);

        this.auditor.hubConnectionChange(sth.id, true);
        //sth.logStream!.pipe(this.logger);

        await this.auditor.onUpdate();

        return sth.id;
    }

    private rollbackFailedSthRegistration(sth: ISTHController) {
        this.logger.warn("Rolling back failed STH registration", sth.id);
        sth.logger.unpipe(this.logger);
        sth.dispose();
        this.commonLogsPipe.removeInStream(sth.id);
        this.sthInfoRegister.clearHostEntities(sth.id);
        this.sthInfoRegister.removeHub(sth.id);
        this.sthConnectionStore.remove(sth.id);
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
        const originalUrl = req.url;

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

        const headers = normalizeForwardedHeaders(req.headers);
        const decision = classifyManagerRoute(req.method, originalUrl, { apiBase: this._config.apiBase });

        if (decision.kind === "follow") {
            await this.handleClassifiedFollowRequestToSTH(sth, decision, req, res, headers);

            return;
        }

        this.writeUnsupportedRouteDecision(decision, res);
    }

    private async handleClassifiedFollowRequestToSTH(
        sth: ISTHController,
        decision: ManagerRouteDecision,
        req: ParsedMessage,
        res: ServerResponse,
        headers: Record<string, string>
    ) {
        const forwarding = prepareManagerFollowForwarding(decision, req.url, headers);

        if (forwarding.kind === "direct-route-metadata") {
            this.writeDirectRouteMetadata(sth.routeDomain, forwarding.targetPath, res);

            return;
        }

        this.writeNativeFollowRedirect(forwarding.location, forwarding.routeDomain || sth.routeDomain, forwarding.targetPath, res);
    }

    private writeNativeFollowRedirect(location: string, routeDomain: string | undefined, targetPath: string, res: ServerResponse) {
        res.writeHead(308, {
            location,
            "x-scramjet-route-decision": "follow",
            "x-scramjet-route-domain": routeDomain || "",
            "x-scramjet-route-target-path": targetPath
        });
        res.end();
    }

    private writeDirectRouteMetadata(routeDomain: string | undefined, targetPath: string | undefined, res: ServerResponse) {
        const payload = JSON.stringify({
            opStatus: ReasonPhrases.CONFLICT,
            routeDecision: "follow",
            routeDomain,
            targetPath,
            error: "Direct STH-to-STH payloads must use the target route directly"
        });

        res.writeHead(409, { "content-type": "application/json" });
        res.end(payload);
    }

    private writeUnsupportedRouteDecision(decision: ManagerRouteDecision, res: ServerResponse) {
        const payload = JSON.stringify({
            opStatus: ReasonPhrases.NOT_IMPLEMENTED,
            routeDecision: decision.kind,
            routeFamily: decision.family,
            error: decision.reason
        });

        res.writeHead(decision.kind === "unsupported-bidirectional" ? 501 : 409, { "content-type": "application/json" });
        res.end(payload);
    }

    private getSthRouteDomain(id: string) {
        return `sth.${id}.scramjet.internal`;
    }

    attachSTHEventHandlers(sth: ISTHController) {
        sth.on("event", (event: SpaceEventMessageData) => {
            this.sthConnectionStore.forEach((id, controller) => {
                if (!controller.isConnectionActive) return;
                if (id !== event.sourceHost) {
                    controller.sendEvent(event).catch((err: Error) => {
                        this.logger.warn("Error sending event to STH", id, err.message);
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

        sth.on("instance", (message: InstanceMessageData) => {
            const instance = this.normalizeInstanceEventPayload(message);

            this.logger.debug("Instance event", instance);

            if (!instance) {
                this.logger.warn("Instance event without instance", message);
                return;
            }

            switch (instance.status) {
                case InstanceStatus.GONE:
                    this.sthInfoRegister.deleteInstance(sth.id, instance.sequence?.id, instance.id);

                    break;
                default:
                    this.sthInfoRegister.addInstance(sth.id, instance);
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

    private normalizeInstanceEventPayload(message: InstanceMessageData | Instance): Instance | undefined {
        return "instance" in message ? message.instance : message;
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

    getSequencesIds() {
        return this.sthInfoRegister
            .getHubs()
            .map((host) => this.sthInfoRegister.getSequencesByHub(host))
            .reduce((prev, curr) => prev.concat(curr), []);
    }

    getSequences(offset = defaultOffset, limit = defaultLimit) {
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
