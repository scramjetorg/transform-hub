import { APIExpose, ManagerConfiguration, MMRestAPI, MonitoringServerConfig, NextCallback, ParsedMessage } from "@scramjet/api-types";
import { getDefaultManagerConfig as getManagerDefaultConfig } from "@scramjet/config";
import { createDefaultHealthComponents, LoadCheck, LoadCheckConfig, summarizeHealth } from "@scramjet/load-check";
import { CommonLogsPipe, createManagerSthLocalBrokerTransport, HealthCheck, Manager } from "@scramjet/manager";
import { IDProvider } from "@scramjet/model";
import { MonitoringServer } from "@scramjet/monitoring-server";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { RestAPI2 } from "@scramjet/rest-api2";
import { FreePortsFinder, merge, promiseTimeout, readJsonFile } from "@scramjet/utility";
import { createVerserHost, VerserHost, VerserLocalBrokerHandle, VerserLocalGuestHandle } from "@signicode/verser2-host";
import findPackage from "find-package-json";
import { IncomingMessage, ServerResponse } from "http";
import { ReasonPhrases } from "http-status-codes";
import { AddressInfo } from "net";
import { DataStream } from "scramjet";
import { Writable } from "stream";
import { createV2HttpDispatcher } from "@scramjet/api-server";
import { MultiManagerConfig } from "../config/multi-manager-configuration";
import { MultiManagerAPIHandler } from "./api/multi-manager-api";
import { MultiManagerAPIV2Handler } from "./api/multi-manager-api-v2";
import { ManagersStore } from "./manager-store";
import { MultiManagerAuditor } from "./mulit-manager-auditor";
import { createVerser2HostOptions } from "./verser2-host-config";
import { resolveManagerVerser2HostConfig } from "./verser2-host-identity";
import { attachVerser2ServerStreamBoundary, handleVerser2RequestBoundary } from "./verser2-request-boundary";

const MANAGER_START_TIMEOUT = 30000;

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

export class MultiManager {
    apiServer: APIExpose;
    verser2Host?: VerserHost;
    /** Isolated mTLS v2 control plane; never carries Manager/STH transport. */
    controlIngressHost?: VerserHost;
    apiBase: string;

    id: string;

    managersStore: ManagersStore;
    healthCheck: HealthCheck;
    config: MultiManagerConfig;
    logger = new ObjLogger(this);

    auditor = new MultiManagerAuditor();

    /**
     * Instance of class providing load check.
     */
    loadCheck: LoadCheck;

    freePortsFinder = new FreePortsFinder();
    private commonLogsPipe = new CommonLogsPipe();
    private managerVerser2Handles = new Map<string, { broker?: VerserLocalBrokerHandle; guest?: VerserLocalGuestHandle }>();
    private controlIngressGuests = new Map<string, VerserLocalGuestHandle>();
    private controlIngressRootGuest?: VerserLocalGuestHandle;
    private stopping = false;

    public get logStream(): Writable {
        return this.commonLogsPipe.getIn();
    }

    public get apiCommonLogsPipe(): CommonLogsPipe {
        return this.commonLogsPipe;
    }

    public get service(): string {
        return name;
    }

    public get apiVersion(): string {
        return this.config.server.version;
    }

    public get version(): string {
        return version;
    }

    public get build(): string {
        return buildInfo.hash || "source";
    }

    public async getV2HealthCheckInfo(): Promise<RestAPI2.HealthCheckInfo<RestAPI2.Root>> {
        const info = this.healthCheck.getHealthCheckInfo();
        const record = info as Record<string, unknown>;
        const scope = { id: this.id, apiBase: this.apiBase.replace(/\/v1\/?$/, "/v2"), spaces: this.managersStore.size };
        const currentHealthy = Object.values((record.modules as Record<string, boolean> | undefined) || { server: true }).every(Boolean);
        const components = await createDefaultHealthComponents({
            current: { name: "multi-manager", healthy: currentHealthy, scope, details: info },
            processMemoryLimitBytes: this.loadCheck?.constants?.SAFE_OPERATION_LIMIT || undefined,
            osDiskPaths: this.loadCheck?.config?.fsPaths
        });

        return summarizeHealth(scope, components, info);
    }

    constructor(apiServer: APIExpose, config: MultiManagerConfig) {
        if (!config.isValid()) throw new Error("Invalid multimanager configuration");

        this.id = config.id.trim().length ? config.id : IDProvider.generate();

        this.config = config;
        this.apiBase = `${config.server.apiBase}/${config.server.version}`;

        this.apiServer = apiServer;
        this.apiServer.server.timeout = 0;
        this.apiServer.server.requestTimeout = 0;

        this.apiServer.server.on("clientError", (err, _socket) => {
            this.logger.error("HTTP SERVER ERROR", err);
        });

        this.managersStore = new ManagersStore();
        this.healthCheck = new HealthCheck(this.apiServer.server);
        this.loadCheck = new LoadCheck(new LoadCheckConfig(config.loadCheckRequirements));
    }

    async start() {
        try {
            await this.startOwnedResources();
        } catch (error) {
            await this.stop();
            throw error;
        }
    }

    private async startOwnedResources() {
        const prettyLog = new DataStream().map(prettyPrint({ colors: this.config.getEntry("logColors") }));

        this.logger.addOutput(prettyLog);

        prettyLog.pipe(process.stdout);

        this.apiServer.log.map((log) => this.logger.debug("API log", log));

        this.logger.info("Starting MultiManager", version);
        this.logger.debug("MultiManager config", this.config.getMasked());

        if (!this.verser2Host) {
            Object.assign(this.config.verser2, await resolveManagerVerser2HostConfig(this.config.verser2, "MultiManager"));
            this.verser2Host = createVerserHost(createVerser2HostOptions(this.config.verser2));
        }

        this.setRouting();

        this.verser2Host?.onLifecycle((event) => this.logger.debug("verser2 Host lifecycle", event));

        if (this.verser2Host) {
            await this.verser2Host.start();
            attachVerser2ServerStreamBoundary((this.verser2Host as any).server, this.logger);
            this.logger.info("verser2 Host started", this.verser2Host.address);
        }

        await this.startControlIngress();

        if (this.config.monitoringServer?.port) {
            this.logger.debug(`starting monitoring server on port ${this.config.monitoringServer?.port}`);
            await this.startMonitoringServer(this.config.monitoringServer).then(
                (res) => {
                    this.logger.info("MonitoringServer started", res);
                },
                (e) => {
                    throw new Error(e);
                }
            );
        }

        this.apiServer.server.listen(this.config.server.apiPort, this.config.server.apiHost, () => {
            const address = this.apiServer.server.address() as AddressInfo;

            this.logger.info("Server started on", address.port, address.address);
        });

        if (this.config.manager) {
            await this.startManagers();
        }
    }
    private async startMonitoringServer(config: MonitoringServerConfig): Promise<MonitoringServerConfig> {
        this.logger.info("Starting monitoring server with config", config);

        const monitoringServer = new MonitoringServer({
            ...config,
            check: async () => !!(await this.loadCheck.getLoadCheck())
        });

        return monitoringServer.start();
    }
    async startManagers() {
        const defaultConfig = { ...getManagerDefaultConfig() };
        const managerConfigs: ManagerConfiguration[] = [];

        if (typeof this.config.manager === "string" && this.config.manager.trim()) {
            managerConfigs.push({ ...defaultConfig, id: this.config.manager, logColors: this.config.getEntry("logColors") });
        }

        if (Array.isArray(this.config.manager)) {
            this.config.manager.forEach((managerConfiguration: ManagerConfiguration) => ({
                ...defaultConfig,
                ...managerConfiguration,
                logLevel: this.config.getEntry("logLevel"),
                logColors: this.config.getEntry("logColors")
            }));
        } else if (typeof this.config.manager === "object") {
            managerConfigs.push({ ...defaultConfig, ...this.config.manager, logColors: this.config.getEntry("logColors") });
        }

        await Promise.all(
            managerConfigs.map(
                (managerConfig, index) =>
                    new Promise<void>((resolve, reject) => {
                        (async () => {
                            if (!managerConfig.id.trim()) {
                                throw new Error("Invalid Manager id");
                            }

                            if (this.managersStore.getById(managerConfig.id)) {
                                throw new Error(`Duplicated Manager ${managerConfig.id}`);
                            }

                            this.logger.trace(`Starting ${index + 1}/${managerConfigs.length} default manager`, managerConfig.id);

                            const manager = new Manager({
                                ...managerConfig,
                                s3: this.config.s3,
                                verser2: {
                                    ...managerConfig.verser2,
                                    controlIngress: managerConfig.verser2.controlIngress && { ...managerConfig.verser2.controlIngress, embedded: true }
                                }
                            });

                            manager.logger.pipe(this.logger);

                            try {
                                const managerMain = manager.main();

                                await this.attachManagerVerser2Peers(manager);

                                manager.setupHealthEndpoint(this.healthCheck);

                                this.auditor.attach(manager.auditor);
                                this.managersStore.add(managerConfig.id, manager);

                                await managerMain;
                            } catch (e) {
                                this.logger.error(`Manager ${this.config.manager} failed`, e);

                                this.managersStore.remove(managerConfig.id);
                                throw e;
                            }
                        })().then(resolve, reject);
                    })
            )
        );

        this.logger.info(
            "Managers started",
            this.managersStore.list().map((manager) => manager.id)
        );
    }

    setRouting() {
        new MultiManagerAPIHandler(this).attach();
    }

    async commonAuditPipe(req: IncomingMessage) {
        await this.auditor.onAuditRequest(req);

        return this.auditor.output;
    }

    async stopManager(id: string) {
        const manager = this.managersStore.getById(id);

        if (!manager) {
            return false;
        }

        await manager.stop();
        await this.detachManagerVerser2Peers(id);
        this.managersStore.remove(id);

        return true;
    }

    private async attachManagerVerser2Peers(manager: Manager) {
        if (!this.verser2Host || !manager.config.verser2.enabled) {
            return;
        }

        await manager.startedPromise;

        const broker = await this.verser2Host.attachLocalBroker({ brokerId: manager.config.verser2.localBroker.peerId });

        manager.setSthBrokerTransport(createManagerSthLocalBrokerTransport(broker));

        const guest = await this.verser2Host.attachLocalGuest({
            guestId: manager.config.verser2.localGuest.peerId,
            routedDomains: [manager.config.verser2.localGuest.routeDomain],
            listener: (req, res) =>
                handleVerser2RequestBoundary(
                    req,
                    res,
                    () =>
                        manager.router.lookup(req as ParsedMessage, res as ServerResponse, () => {
                            res.statusCode = 404;
                            res.end();
                        }),
                    this.logger
                )
        });

        this.managerVerser2Handles.set(manager.config.id, { broker, guest });
        try {
            await this.attachManagerControlIngress(manager);
        } catch (error) {
            await this.detachManagerVerser2Peers(manager.config.id);
            throw error;
        }
    }

    private async detachManagerVerser2Peers(managerId: string) {
        const handles = this.managerVerser2Handles.get(managerId);

        if (!handles) {
            return;
        }

        this.managerVerser2Handles.delete(managerId);
        await Promise.allSettled([handles.broker?.close("manager-stop"), handles.guest?.close("manager-stop")]);
        const controlGuest = this.controlIngressGuests.get(managerId);
        this.controlIngressGuests.delete(managerId);
        await controlGuest?.close("manager-stop");
    }

    private async startControlIngress() {
        const ingress = this.config.verser2.controlIngress;
        if (!ingress?.enabled || this.controlIngressHost) return;

        const controlConfig = await resolveManagerVerser2HostConfig({
            ...this.config.verser2,
            host: ingress.host,
            localGuest: ingress.guest
        }, "MultiManager control ingress");
        this.controlIngressHost = createVerserHost(createVerser2HostOptions(controlConfig));
        this.controlIngressHost.onLifecycle(event => this.logger.debug("control ingress lifecycle", event));
        try {
            await this.controlIngressHost.start();
            attachVerser2ServerStreamBoundary((this.controlIngressHost as any).server, this.logger);
            this.controlIngressRootGuest = await this.controlIngressHost.attachLocalGuest({
                guestId: ingress.guest.peerId,
                routedDomains: [ingress.guest.routeDomain],
                listener: (req, res) => createV2HttpDispatcher(new MultiManagerAPIV2Handler(this).createV2Router()).listener(req as any, res as any)
            });
        } catch (error) {
            const host = this.controlIngressHost as VerserHost & { stop?: () => Promise<void>; close?: () => Promise<void> };
            this.controlIngressHost = undefined;
            await (host.stop?.() || host.close?.());
            throw error;
        }
        this.logger.info("Verser2 control ingress started", this.controlIngressHost.address);
    }

    private async attachManagerControlIngress(manager: Manager) {
        const ingress = manager.config.verser2.controlIngress;
        if (!this.controlIngressHost || !ingress) return;

        const guest = await this.controlIngressHost.attachLocalGuest({
            guestId: ingress.guest.peerId,
            routedDomains: [ingress.guest.routeDomain],
            listener: (req, res) => createV2HttpDispatcher(manager.createV2Router()).listener(req as any, res as any)
        });
        this.controlIngressGuests.set(manager.config.id, guest);
    }

    async stop() {
        if (this.stopping) return;
        this.stopping = true;
        const guests = [this.controlIngressRootGuest, ...this.controlIngressGuests.values()];
        this.controlIngressRootGuest = undefined;
        this.controlIngressGuests.clear();
        await Promise.allSettled(guests.map(guest => guest?.close("multi-manager-stop")));
        const host = this.controlIngressHost as (VerserHost & { stop?: () => Promise<void>; close?: () => Promise<void> }) | undefined;
        this.controlIngressHost = undefined;
        await (host?.stop?.() || host?.close?.());
        const dataHandles = [...this.managerVerser2Handles.entries()];
        this.managerVerser2Handles.clear();
        await Promise.allSettled(dataHandles.flatMap(([, handles]) => [handles.broker?.close("multi-manager-stop"), handles.guest?.close("multi-manager-stop")]));
        const dataHost = this.verser2Host as (VerserHost & { stop?: () => Promise<void>; close?: () => Promise<void> }) | undefined;
        this.verser2Host = undefined;
        await (dataHost?.stop?.() || dataHost?.close?.());
        const managers = this.managersStore.list();
        await Promise.allSettled(managers.map(manager => manager.stop()));
        for (const manager of managers) this.managersStore.remove(manager.id);
        if (this.apiServer.server.listening) await new Promise<void>(resolve => this.apiServer.server.close(() => resolve()));
    }

    async cpmMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        const manager = this.managersStore.getById(req.params!.id);

        if (manager) {
            try {
                await promiseTimeout(manager.startedPromise, MANAGER_START_TIMEOUT);
            } catch (_e) {
                res.statusCode = 408;
                res.end();

                return next();
            }

            this.logger.debug("Processing request for manager", req.params!.id);

            if (!manager.router) {
                throw new Error("Manager's Router not initialized.");
            }

            req.url = req.url?.substring(`${this.apiBase}/cpm`.length + 1 + req.params!.id.length);

            return manager.router.lookup(req, res, next);
        }

        res.statusCode = 404;
        res.end();

        return next();
    }

    async handleStartManagerRequest(req: ParsedMessage): Promise<MMRestAPI.OpResponse<MMRestAPI.SendStartManagerResponse>> {
        const requestPayload = req.body || {};

        this.logger.trace("Received start manager request", requestPayload);

        if (await this.loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE
            };
        }

        const managerConfig = getManagerDefaultConfig();

        const id = IDProvider.generate();

        managerConfig.id = id;
        merge(managerConfig, requestPayload.manager);

        if (this.managersStore.getById(managerConfig.id)) {
            return {
                error: `Manager with id ${managerConfig.id} already exists.`,
                opStatus: ReasonPhrases.CONFLICT
            };
        }

        const manager = new Manager({
            ...managerConfig,
            s3: this.config.s3,
            verser2: {
                ...managerConfig.verser2,
                controlIngress: managerConfig.verser2.controlIngress && { ...managerConfig.verser2.controlIngress, embedded: true }
            }
        });

        manager.logger.pipe(this.logger);

        try {
            await manager.main();

            await this.attachManagerVerser2Peers(manager);

            manager.setupHealthEndpoint(this.healthCheck);

            this.auditor.attach(manager.auditor);
            this.managersStore.add(managerConfig.id, manager);

            return { opStatus: ReasonPhrases.ACCEPTED, id: managerConfig.id };
        } catch {
            return { error: "Start Manager failed", opStatus: ReasonPhrases.INTERNAL_SERVER_ERROR };
        }
    }

    handleListManagersRequest(): MMRestAPI.GetManagersResponse {
        return this.managersStore.list().map((manager: Manager) => ({
            id: manager.config.id
        }));
    }
}
