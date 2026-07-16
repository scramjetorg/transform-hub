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
    DisconnectReason,
    ISTHConnectionStore,
    ISTHController,
    ISTHInfoRegister
} from "./types/from-types";
import { ActorType } from "./types/from-types";
import { CeroError, forwardRoutedRequest, getRouter, normalizeForwardedHeaders as normalizeApiForwardedHeaders } from "@scramjet/api-server";
import { Router, registerHttpRoutes } from "@scramjet/api-router";
import { RestAPI2 } from "@scramjet/rest-api2";
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
import { csrEnrollmentOptions, getDefaultManagerConfig, managerVerser2Options, maskConfig } from "@scramjet/config";
import { merge, readJsonFile } from "@scramjet/utility";
import { ServiceDiscovery, TopicActor } from "./service-discovery";
import { ManagerSthBrokerTransport, type RouteChangeEvent } from "./verser2-transport";
import { classifyManagerRoute, ManagerRouteDecision, prepareManagerFollowForwarding } from "./route-classifier";
import { decideRouteForwardingPolicy, isTrustedSthRouteDomain } from "./route-forwarding-policy";

import { ObjLogger } from "@scramjet/obj-logger";
import { HealthCheck } from "./health-check";
import { ManagerAuditor } from "./manager-auditor";

import { getS3Router } from "./s3-router";
import { Client as MinioClient } from "minio";
import * as fs from "fs/promises";
import { homedir } from "os";
import { ManagerAPIHandler } from "./api/manager-api";
import { CsrEnrollmentAuthority } from "./csr-enrollment";

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";
const defaultLimit = 100;
const defaultOffset = 0;

type HubInventoryState = {
    sequencesReceived: boolean;
    instancesReceived: boolean;
};

type SequenceInfoWithInstances = {
    id: string;
    config: any;
    location: string;
    instances: string[];
};

type HubStateSnapshot = {
    sequences: SequenceInfoWithInstances[];
    instances: Array<{ key: string; instance: any }>;
    inventory: HubInventoryState | undefined;
};

export type SthRegistrationPayload = {
    id?: string;
    routeDomain?: string;
    enrollmentToken?: string;
    accessKey?: string;
    description?: string;
    tags?: string[];
};

export const normalizeForwardedHeaders = normalizeApiForwardedHeaders;

export function assertAuthorizedRegistrationPeer(
    authority: CsrEnrollmentAuthority,
    claimedHubId: string,
    peerFingerprint256: string | undefined,
    peerHubId: string | undefined,
    suppliedFingerprint256?: unknown
): void {
    if (suppliedFingerprint256 !== undefined) throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
    if (!peerFingerprint256 || !peerHubId || peerHubId !== claimedHubId || !authority.isClientFingerprintAuthorizedForHub(peerFingerprint256, claimedHubId))
        throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
}

export function maskManagerConfig(config: ManagerConfiguration): ManagerConfiguration {
    const safe = {} as ManagerConfiguration;

    merge(safe, config);

    if (safe.s3) {
        if (safe.s3.accessKey) safe.s3.accessKey = "********";
        if (safe.s3.secretKey) safe.s3.secretKey = "********";
    }

    return maskConfig(safe, [...managerVerser2Options, ...csrEnrollmentOptions]) as ManagerConfiguration;
}

export class Manager implements IComponent {
    id: string;
    private _apiRouter: APIRoute;
    private s3Middleware!: Awaited<ReturnType<typeof getS3Router>>;
    private sthConnectionStore: ISTHConnectionStore = new SthConnectionStore();
    private serviceDiscovery: ServiceDiscovery = new ServiceDiscovery();
    private readonly _config: ManagerConfiguration = getDefaultManagerConfig();
    private sthBrokerTransport?: ManagerSthBrokerTransport;
    private routeChangeUnsubscribe?: () => void;
    private hubInventoryState = new Map<string, HubInventoryState>();
    private csrEnrollmentAuthority?: CsrEnrollmentAuthority;

    private sthInfoRegister: ISTHInfoRegister = new STHInfoRegister();
    private commonLogsPipe = new CommonLogsPipe();
    private loadCheck: LoadCheck;
    private managerHealthCheck?: HealthCheck;
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

    public get csrEnrollment(): CsrEnrollmentAuthority | undefined {
        return this.csrEnrollmentAuthority;
    }

    public get apiHealthCheck(): HealthCheck | undefined {
        return this.managerHealthCheck;
    }

    public get apiS3Middleware(): Awaited<ReturnType<typeof getS3Router>> {
        return this.s3Middleware;
    }

    public set apiS3Middleware(s3Middleware: Awaited<ReturnType<typeof getS3Router>>) {
        this.s3Middleware = s3Middleware;
    }

    public setSthBrokerTransport(transport: ManagerSthBrokerTransport) {
        // Unsubscribe previous listener if any.
        this.routeChangeUnsubscribe?.();
        this.routeChangeUnsubscribe = undefined;

        this.sthBrokerTransport = transport;

        // Subscribe to route-change events if the transport supports it.
        if (typeof transport.onRouteChange === "function") {
            this.routeChangeUnsubscribe = transport.onRouteChange((event: RouteChangeEvent) => {
                if (event.type === "removed") {
                    // Guard: if the transport still reports the route as ready, this is
                    // a stale event targeting a new replacement hub. Skip cleanup.
                    if (this.sthBrokerTransport?.isRouteReady(event.domain)) {
                        return;
                    }

                    this.sthConnectionStore.forEach((_id: string, controller: any) => {
                        if (controller.routeDomain === event.domain) {
                            controller.healthy = false;
                            this.logger.warn(`Route ${event.type} for STH ${controller.id} domain ${event.domain}`, event.reason || "");
                            this.cleanupHubState(controller.id, event.type);
                            this.auditor.onUpdate().catch((err: Error) => this.logger.warn("Auditor update after route event failed", err.message));
                        }
                    });
                } else if (event.type === "degraded") {
                    this.sthConnectionStore.forEach((_id: string, controller: any) => {
                        if (controller.routeDomain === event.domain) {
                            // If the route is currently ready, be conservative: skip
                            // cleanup to avoid clearing a new replacement hub.
                            if (this.sthBrokerTransport?.isRouteReady(event.domain)) {
                                return;
                            }

                            controller.healthy = false;
                            this.logger.warn(`Route ${event.type} for STH ${controller.id} domain ${event.domain}`, event.reason || "");
                            this.cleanupHubState(controller.id, event.type);
                            this.auditor.onUpdate().catch((err: Error) => this.logger.warn("Auditor update after route event failed", err.message));
                        }
                    });
                }
            });
        }
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

        const enrollment = (this._config as ManagerConfiguration & { csrEnrollment?: any }).csrEnrollment;
        if (enrollment?.enabled === true) {
            this.csrEnrollmentAuthority = new CsrEnrollmentAuthority(enrollment);
        }

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
                port: this.config.s3.port
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
        this.managerHealthCheck = healthCheck;
        const createV1HealthRouter = () =>
            Router.create({ basePath: this._config.apiBase }).route(
                Router.get("/health", {
                    id: "manager.v1.health",
                    schemas: { response: z.object({}).passthrough() },
                    handler: () => healthCheck.getHealthCheckInfo()
                })
            );

        registerHttpRoutes(this._apiRouter, createV1HealthRouter());
    }

    async getV2HealthCheckInfo(): Promise<RestAPI2.HealthCheckInfo<RestAPI2.Space>> {
        const info = this.managerHealthCheck?.getHealthCheckInfo() || {
            uptime: process.uptime(),
            timestamp: Date.now(),
            modules: { sthServer: false }
        };
        const aggregation = this.getAggregationReadiness();
        const scope = { id: this.id || this._config.id, hubs: aggregation.hubs };
        const currentHealthy = Object.values(info.modules || {}).every(Boolean);
        const components = await createDefaultHealthComponents({
            current: { name: "manager", healthy: currentHealthy, scope, details: { ...info, aggregation } },
            processMemoryLimitBytes: this.loadCheck?.constants?.SAFE_OPERATION_LIMIT || undefined,
            osDiskPaths: this.loadCheck?.config?.fsPaths,
            extraComponents: [
                {
                    name: "manager.aggregation",
                    healthy: aggregation.ready,
                    status: aggregation.ready ? "healthy" : "degraded",
                    scope,
                    details: aggregation
                }
            ]
        });

        return summarizeHealth(scope, components, { ...info, aggregation });
    }

    getAggregationReadiness() {
        const hubs = this.sthConnectionStore.getSTHControllersInfo();
        const storeSequences = this.s3Middleware?.index?.sequences?.length || 0;
        const sthSequences = this.sthInfoRegister.getSequences().length;
        const instances = this.sthInfoRegister.getInstances().length;
        const byHub = hubs.map((hub: any) => ({
            id: hub.id,
            active: Boolean(hub.isConnectionActive),
            healthy: Boolean(hub.healthy),
            sequences: this.getSequencesByHubSafe(hub.id).length,
            instances: this.getInstancesByHubSafe(hub.id).length,
            inventoryConsumed: this.isHubInventoryConsumed(hub.id)
        }));
        const activeHubs = byHub.filter((hub: any) => hub.active);

        return {
            ready: activeHubs.every((hub: any) => hub.inventoryConsumed),
            hubs: byHub.length,
            activeHubs: activeHubs.length,
            sequences: storeSequences + sthSequences,
            instances,
            byHub
        };
    }

    private markHubInventory(hostId: string, kind: keyof HubInventoryState) {
        const state = this.hubInventoryState.get(hostId) || { sequencesReceived: false, instancesReceived: false };

        state[kind] = true;
        this.hubInventoryState.set(hostId, state);
    }

    private clearHubInventory(hostId: string) {
        this.hubInventoryState.delete(hostId);
    }

    private isHubInventoryConsumed(hostId: string) {
        const state = this.hubInventoryState.get(hostId);

        return Boolean(state?.sequencesReceived && state.instancesReceived);
    }

    private getSequencesByHubSafe(hostId: string) {
        try {
            return this.sthInfoRegister.getSequencesByHub(hostId);
        } catch (_error) {
            return [];
        }
    }

    private getInstancesByHubSafe(hostId: string) {
        try {
            return this.sthInfoRegister.getInstancesByHub(hostId);
        } catch (_error) {
            return [];
        }
    }

    handleTopicUpstreamRequest(req: ParsedMessage, _res: ServerResponse) {
        const ps = new PassThrough({ emitClose: true });
        const params = req.params || {};
        const contentType = ((req.headers || {}).contentType as string) || "";

        this.logger.debug("GET topic ", req.url);

        const topicActor = new TopicActor(params.name, ActorRole.CONSUMER, ActorType.API, contentType, undefined);

        topicActor.addStream(ps);

        this.serviceDiscovery.register(topicActor, { contentType });

        req.on("close", () => {
            topicActor.retired = true;
            ps.end();
            this.serviceDiscovery.onUpdate("upstream close");
        }).on("error", (e: Error) => {
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

    async handleSthRegistration(payload: SthRegistrationPayload, peerCertificateFingerprint256?: string, peerCertificateHubId?: string): Promise<string> {
        this.logger.info("STH Api. Incoming verser2 registration.");

        if (!this.sthBrokerTransport) {
            throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
        }

        const id = typeof payload.id === "string" && payload.id.trim().length ? payload.id : IDProvider.generate();
        const offeredRouteDomain = typeof payload.routeDomain === "string" && payload.routeDomain.trim().length ? payload.routeDomain.trim() : undefined;
        const routeDomain = offeredRouteDomain && isTrustedSthRouteDomain(id, offeredRouteDomain) ? offeredRouteDomain : this.getSthRouteDomain(id);
        const registrationToken = this.config.verser2.registration.token;

        if (this.csrEnrollmentAuthority)
            assertAuthorizedRegistrationPeer(
                this.csrEnrollmentAuthority,
                id,
                peerCertificateFingerprint256,
                peerCertificateHubId,
                (payload as SthRegistrationPayload & { clientCertificateFingerprint256?: unknown }).clientCertificateFingerprint256
            );

        if (offeredRouteDomain && offeredRouteDomain !== routeDomain) {
            this.logger.warn("Ignoring untrusted STH route domain", id, offeredRouteDomain, routeDomain);
        }

        if (registrationToken && payload.enrollmentToken !== registrationToken) {
            this.logger.warn("Refusing STH registration with invalid verser2 enrollment token", id);
            throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
        }

        const previousSth = this.sthConnectionStore.getById(id);
        let sth: ISTHController | undefined = previousSth;

        if (sth) {
            // Unpipe previous controller but do NOT dispose yet.
            // Disposal happens only after the new init succeeds so that
            // rollback can restore a live controller.
            sth.logger.unpipe(this.logger);

            this.logger.info("STH re-registering, id:", id);

            // Snapshot previous hub state so we can restore it on rollback.
            const snapshot = this.captureHubSnapshot(previousSth.id);

            sth = new STHController(id, {
                brokerTransport: this.sthBrokerTransport,
                routeDomain,
                accessKey: payload.accessKey,
                description: payload.description,
                tags: payload.tags
            });

            sth.logger.pipe(this.logger, { end: false });

            this.sthInfoRegister.clearHostEntities(sth.id);
            this.clearHubInventory(sth.id);
            this.sthInfoRegister.addHub(sth.id);
            this.sthConnectionStore.add(sth);
            this.attachSTHEventHandlers(sth);
            this.commonLogsPipe.removeInStream(sth.id);

            try {
                await sth.init();
            } catch (error) {
                this.rollbackFailedSthRegistration(sth, previousSth, snapshot);
                throw error;
            }

            // Init succeeded: dispose the previous controller now.
            previousSth.dispose();
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
            this.clearHubInventory(sth.id);
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

    private cleanupHubState(id: string, routeEventType?: string) {
        this.sthInfoRegister.handleHubDisconnect(id);
        this.clearHubInventory(id);
        this.commonLogsPipe.removeInStream(id);
        this.auditor.hubConnectionChange(id, false);
        this.serviceDiscovery.onUpdate(routeEventType ? `route ${routeEventType}` : "hub disconnect");
    }

    private rollbackFailedSthRegistration(sth: ISTHController, previousSth?: ISTHController, previousSnapshot?: HubStateSnapshot) {
        this.logger.warn("Rolling back failed STH registration", sth.id);
        sth.logger.unpipe(this.logger);
        sth.dispose();
        this.commonLogsPipe.removeInStream(sth.id);
        this.sthInfoRegister.clearHostEntities(sth.id);
        this.sthInfoRegister.removeHub(sth.id);
        this.clearHubInventory(sth.id);
        this.sthConnectionStore.remove(sth.id);

        // On replacement failure, restore the previous controller to the store.
        if (previousSth) {
            this.sthConnectionStore.add(previousSth);
            previousSth.logger.pipe(this.logger, { end: false });
            // Re-add the previous controller's log stream since it was removed
            // before the replacement init attempt.
            this.commonLogsPipe.addInStream(previousSth.id, previousSth.logStream!);

            // Restore the previous hub's sequences, instances and inventory
            // state that were cleared before the replacement init attempt.
            if (previousSnapshot) {
                this.restoreHubSnapshot(previousSth.id, previousSnapshot);
            }
        }
    }

    private captureHubSnapshot(hostId: string): HubStateSnapshot {
        const reg = this.sthInfoRegister as any;
        const sequences: SequenceInfoWithInstances[] = (reg.sequencesStore.get(hostId) || []).map((s: any) => ({ ...s, instances: [...s.instances] }));

        const instances: Array<{ key: string; instance: Instance }> = [];
        const instStore = reg.instancesStore as Map<string, Instance>;

        for (const [key, instance] of instStore) {
            if (key.startsWith(hostId + ":")) {
                instances.push({ key, instance });
            }
        }

        const inventory = this.hubInventoryState.get(hostId) ? { ...this.hubInventoryState.get(hostId)! } : undefined;

        return { sequences, instances, inventory };
    }

    private restoreHubSnapshot(hostId: string, snapshot: HubStateSnapshot) {
        const reg = this.sthInfoRegister as any;

        // Re-create the hub entry with its sequence→instances map.
        const seqMap = new Map(snapshot.sequences.map((s: any) => [s.id, new Set(s.instances)]));

        reg.hostsMap.set(hostId, seqMap);

        // Restore the sequences store.
        if (snapshot.sequences.length > 0) {
            reg.sequencesStore.set(hostId, snapshot.sequences);
        }

        // Restore instance entries.
        for (const { key, instance } of snapshot.instances) {
            reg.instancesStore.set(key, instance);
        }

        // Restore the hub inventory state.
        if (snapshot.inventory) {
            this.hubInventoryState.set(hostId, snapshot.inventory);
        }
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
        const routeDomain = sth.routeDomain || forwarding.routeDomain || "";
        const targetPath = this.normalizeSthTargetPath(forwarding.targetPath || req.url || "/");

        if (forwarding.kind === "direct-route-metadata") {
            this.writeDirectRouteMetadata(routeDomain, targetPath, res);

            return;
        }

        await this.forwardRequestToSTH(sth, req, res, targetPath, headers, forwarding.location);
    }

    public async forwardRequestToSTH(
        sth: ISTHController,
        req: ParsedMessage,
        res: ServerResponse,
        targetPath: string,
        headers: Record<string, string> = normalizeForwardedHeaders(req.headers),
        fallbackLocation?: string
    ) {
        const routeDomain = sth.routeDomain || "";
        const normalizedTargetPath = this.normalizeSthTargetPath(targetPath);
        const policy = decideRouteForwardingPolicy({
            routeDomain,
            targetPath: normalizedTargetPath,
            origin: "manager-downward"
        });

        if (policy.action === "tunnel" && this.sthBrokerTransport) {
            await forwardRoutedRequest({
                transport: this.sthBrokerTransport,
                domain: routeDomain,
                req,
                res,
                path: normalizedTargetPath,
                headers,
                routeReadinessMs: this._config.verser2.timeouts.routeReadinessMs,
                requestTimeoutMs: this._config.verser2.timeouts.requestMs,
                onError: (error) => this.logger.warn("Manager routed follow request failed", error)
            });

            return;
        }

        this.writeNativeFollowRedirect(
            this.createVerserRouteLocation(routeDomain, normalizedTargetPath, fallbackLocation || normalizedTargetPath),
            routeDomain,
            normalizedTargetPath,
            res
        );
    }

    private normalizeSthTargetPath(targetPath: string): string {
        const path = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

        if (/^\/api\/v\d+(?:\/|$)/.test(path)) {
            return path;
        }

        const apiBase = this._config.apiBase.endsWith("/") ? this._config.apiBase.slice(0, -1) : this._config.apiBase;

        return `${apiBase}${path}`;
    }

    private createVerserRouteLocation(routeDomain: string | undefined, targetPath: string, fallback: string): string {
        if (!routeDomain) {
            return fallback;
        }

        const path = targetPath.startsWith("/") ? targetPath : `/${targetPath}`;

        return `http://${routeDomain}${path}`;
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
            this.sthConnectionStore.forEach((id: any, controller: any) => {
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

        sth.on("sequences", () => {
            this.markHubInventory(sth.id, "sequencesReceived");
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

        sth.on("instances", () => {
            this.markHubInventory(sth.id, "instancesReceived");
        });

        sth.on("topic", (topicData: any) => {
            this.logger.trace("STH topic", topicData);

            const topicName = topicData.topicName;

            if (topicData.status === "add") {
                const role = topicData.localProvider || topicData.provides ? ActorRole.PROVIDER : ActorRole.CONSUMER;

                this.logger.debug("Registering host topic", { name: topicName, role, hostId: sth.id }, topicData.contentType);
                this.serviceDiscovery.register(new TopicActor(topicName, role, ActorType.HOST, topicData.contentType, sth), { contentType: topicData.contentType });
            } else if (topicData.status === "remove") {
                const topic = this.serviceDiscovery.topics.get(topicName);
                const hostActor = topic?.actors.find((actor: any) => actor.host?.id === sth.id);

                if (hostActor) {
                    this.serviceDiscovery.unregister(hostActor);
                }
            }
        });

        sth.on("disconnected", () => {
            this.cleanupHubState(sth.id);
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
            instances: []
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

        const response = hubs
            .sort((a: any, b: any) => {
                const aVal = a.isConnectionActive ? 10 : 0 + (a.healthy ? 1 : 0);
                const bVal = b.isConnectionActive ? 10 : 0 + (b.healthy ? 1 : 0);

                return bVal - aVal;
            })
            .map((hub: any) => {
                return {
                    id: hub.id,
                    info: hub.info,
                    healthy: hub.healthy,
                    selfHosted: hub.selfHosted,
                    isConnectionActive: hub.isConnectionActive,
                    description: hub.description,
                    tags: hub.tags,
                    disconnectReason: hub.disconnectReason,
                    topics: topics.filter((topic: any) => topic.actors.some((actor: any) => actor.hostId === hub.id)).map((topic: any) => topic.name),
                    sequences: this.sthInfoRegister.getSequencesByHub(hub.id),
                    instances: this.sthInfoRegister.getInstancesByHub(hub.id)
                };
            });

        return response;
    }

    getSequencesIds() {
        return this.sthInfoRegister
            .getHubs()
            .map((host: any) => this.sthInfoRegister.getSequencesByHub(host))
            .reduce((prev: any, curr: any) => prev.concat(curr), []);
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
        const topics = this.serviceDiscovery.list().map((topic: any) => topic.name);
        const sequences = this.getSequences().map((seq: any) => seq.id);
        const instances = this.getInstances().map((inst: any) => inst.id);

        return {
            topics: topics,
            hubs: hubs,
            sequences: sequences,
            instances: instances
        };
    }

    async stop() {
        this.logger.info("Stopping manager...");
        this.routeChangeUnsubscribe?.();
        this.routeChangeUnsubscribe = undefined;
        this.logger.info("Manager stopped successfully.");
    }
}
