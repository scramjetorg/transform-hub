import findPackage from "find-package-json";

import { APIExpose, ManagerConfiguration, MMRestAPI, MonitoringServerConfig, NextCallback, ParsedMessage } from "@scramjet/types";

import { FreePortsFinder, merge, promiseTimeout, readJsonFile } from "@scramjet/utility";

import { AddressInfo } from "net";
import { IDProvider } from "@scramjet/model";
import { LoadCheck, LoadCheckConfig } from "@scramjet/load-check";
import { Manager, CommonLogsPipe, HealthCheck } from "@scramjet/manager";
import { ManagersStore } from "./manager-store";
import { Writable } from "stream";
import { ReasonPhrases } from "http-status-codes";
import { IncomingMessage, ServerResponse } from "http";
import { getDefaultConfig as getManagerDefaultConfig } from "@scramjet/manager-config";
import { createVerserHost, VerserHost } from "@signicode/verser2-host";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import { MultiManagerAuditor } from "./mulit-manager-auditor";
import { MultiManagerConfig } from "../config/multi-manager-configuration";
import { MonitoringServer } from "@scramjet/monitoring-server";
import { createManagerSthLocalBrokerTransport } from "@scramjet/manager";
import { createVerser2HostOptions } from "./verser2-host-config";
import { resolveManagerVerser2HostConfig } from "./verser2-host-identity";
import { getMultiManagerVerser2TrustExport } from "./verser2-trust-export";

const MANAGER_START_TIMEOUT = 30000;

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

export class MultiManager {
    apiServer: APIExpose;
    verser2Host?: VerserHost;
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

    public get logStream(): Writable {
        return this.commonLogsPipe.getIn();
    }

    public get service(): string {
        return name;
    }

    public get apiVersion(): string { return this.config.server.version; }

    public get version(): string {
        return version;
    }

    public get build(): string {
        return buildInfo.hash || "source";
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

        this.verser2Host?.onLifecycle(event => this.logger.debug("verser2 Host lifecycle", event));

        if (this.verser2Host) {
            await this.verser2Host.start();
            this.logger.info("verser2 Host started", this.verser2Host.address);
        }

        if (this.config.monitoringServer?.port) {
            this.logger.debug(`starting monitoring server on port ${this.config.monitoringServer?.port}`);
            await this.startMonitoringServer(this.config.monitoringServer).then((res) => {
                this.logger.info("MonitoringServer started", res);
            }, (e) => {
                throw new Error(e);
            });
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
            check: async () => !!await this.loadCheck.getLoadCheck()
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

        await Promise.all(managerConfigs.map(
            (managerConfig, index) => new Promise<void>(async (resolve, reject) => {
                if (!managerConfig.id.trim()) {
                    throw new Error("Invalid Manager id");
                }

                if (this.managersStore.getById(managerConfig.id)) {
                    throw new Error(`Duplicated Manager ${managerConfig.id}`);
                }

                this.logger.trace(`Starting ${index + 1}/${managerConfigs.length} default manager`, managerConfig.id);

                const manager = new Manager({ ...managerConfig, s3: this.config.s3 });

                manager.logger.pipe(this.logger);

                try {
                    const managerMain = manager.main();

                    await this.attachManagerVerser2Peers(manager);

                    manager.setupHealthEndpoint(this.healthCheck);

                    this.auditor.attach(manager.auditor);
                    this.managersStore.add(managerConfig.id, manager);

                    await managerMain;
                    resolve();
                } catch (e) {
                    this.logger.error(`Manager ${this.config.manager} failed`, e);

                    this.managersStore.remove(managerConfig.id);
                    reject(e);
                }
            })));

        this.logger.info("Managers started", this.managersStore.list().map(manager => manager.id));
    }

    setRouting() {
        this.apiServer.use("*", (req, _res, next) => {
            this.logger.trace("API request", req.method, req.url);
            return next();
        });
        this.apiServer.get(
            `${this.apiBase}/version`,
            (): MMRestAPI.GetVersionResponse => ({
                service: this.service,
                apiVersion: this.apiVersion,
                version,
                build: this.build,
            })
        );

        this.apiServer.get(
            `${this.apiBase}/info`,
            (): MMRestAPI.GetInfoReposnse => ({
                apiBase: this.apiBase,
                apiPort: this.config.server.apiPort,
                id: this.id,
                managersCount: this.managersStore.size,
            })
        );

        this.apiServer.get(
            `${this.apiBase}/load-check`,
            async (): Promise<MMRestAPI.GetLoadCheckResponse> => this.loadCheck.getLoadCheck()
        );
        this.apiServer.get(`${this.apiBase}/list`, () => this.handleListManagersRequest());
        this.apiServer.get(`${this.apiBase}/health`, () => this.healthCheck.getHealthCheckInfo());
        this.apiServer.get(`${this.apiBase}/verser2/trust/:id?`, (req: ParsedMessage) => {
            const manager = req.params?.id ? this.managersStore.getById(req.params.id) : undefined;

            if (req.params?.id && !manager) {
                throw new Error(`Manager ${req.params.id} not found`);
            }

            return getMultiManagerVerser2TrustExport(this.config.verser2, manager?.config);
        });

        this.apiServer.op("post", `${this.apiBase}/start`, (req) => this.handleStartManagerRequest(req));
        this.apiServer.op(
            "post",
            `${this.apiBase}/cpm/:id/stop`,
            async (req, _res): Promise<MMRestAPI.OpResponse<MMRestAPI.SendStopManagerResponse>> => {
                const manager = this.managersStore.getById(req.params!.id);

                if (manager) {
                    await manager.stop();

                    this.managersStore.remove(req.params!.id);
                    return { id: req.params!.id, opStatus: ReasonPhrases.OK };
                }

                return { opStatus: ReasonPhrases.NOT_FOUND };
            }
        );

        this.apiServer.use(`${this.apiBase}/cpm/:id`, async (req, res, next) => await this.cpmMiddleware(req, res, next));

        this.apiServer.upstream(`${this.apiBase}/log`, this.commonLogsPipe.getOut());
        this.apiServer.upstream(`${this.apiBase}/audit`, (req, _res) => this.commonAuditPipe(req));
    }

    async commonAuditPipe(req: IncomingMessage) {
        await this.auditor.onAuditRequest(req);

        return this.auditor.output;
    }

    private async attachManagerVerser2Peers(manager: Manager) {
        if (!this.verser2Host || !manager.config.verser2.enabled) {
            return;
        }

        await manager.startedPromise;

        const broker = await this.verser2Host.attachLocalBroker({ brokerId: manager.config.verser2.localBroker.peerId });

        manager.setSthBrokerTransport(createManagerSthLocalBrokerTransport(broker));

        await this.verser2Host.attachLocalGuest({
            guestId: manager.config.verser2.localGuest.peerId,
            routedDomains: [manager.config.verser2.localGuest.routeDomain],
            listener: (req, res) => manager.router.lookup(req as ParsedMessage, res as ServerResponse, () => {
                res.statusCode = 404;
                res.end();
            })
        });
    }

    async cpmMiddleware(req: ParsedMessage, res: ServerResponse, next: NextCallback) {
        const manager = this.managersStore.getById(req.params!.id);

        if (manager) {
            try {
                await promiseTimeout(
                    manager.startedPromise,
                    MANAGER_START_TIMEOUT
                );
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

    async handleStartManagerRequest(
        req: ParsedMessage
    ): Promise<MMRestAPI.OpResponse<MMRestAPI.SendStartManagerResponse>> {
        const requestPayload = req.body || {};

        this.logger.trace("Received start manager request", requestPayload);

        if (await this.loadCheck.overloaded()) {
            return {
                opStatus: ReasonPhrases.INSUFFICIENT_SPACE_ON_RESOURCE,
            };
        }

        const managerConfig = getManagerDefaultConfig();

        const id = IDProvider.generate();

        merge(managerConfig, {
            id,
        });
        merge(managerConfig, requestPayload.manager);

        if (this.managersStore.getById(managerConfig.id)) {
            return {
                error: `Manager with id ${managerConfig.id} already exists.`,
                opStatus: ReasonPhrases.CONFLICT,
            };
        }

        const manager = new Manager({ ...managerConfig, s3: this.config.s3 });

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
            id: manager.config.id,
        }));
    }

}
