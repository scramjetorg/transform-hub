import findPackage from "find-package-json";

import { APIExpose, ManagerConfiguration, MMRestAPI, MonitoringServerConfig, NextCallback, ParsedMessage } from "@scramjet/types";

import { FreePortsFinder, merge, promiseTimeout, readJsonFile } from "@scramjet/utility";

import { AddressInfo } from "net";
import { IDProvider } from "@scramjet/model";
import { LoadCheck, LoadCheckConfig } from "@scramjet/load-check";
import { Manager, CommonLogsPipe, HealthCheck } from "@scramjet/manager";
import { ManagersStore } from "./manager-store";
import { Duplex, Writable } from "stream";
import { ReasonPhrases } from "http-status-codes";
import { IncomingMessage, ServerResponse } from "http";
import { getDefaultConfig as getManagerDefaultConfig } from "@scramjet/manager-config";
import { Verser, VerserConnection } from "@scramjet/verser";
import { createVerserHost, VerserHost } from "@signicode/verser2-host";
import { MultiHostController } from "./multi-host-controller";
import { MultiHostControllerStore } from "./multi-host-controller-store";
import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import { MultiManagerAuditor } from "./mulit-manager-auditor";
import { MultiManagerConfig } from "../config/multi-manager-configuration";
import { MonitoringServer } from "@scramjet/monitoring-server";
import { createManagerSthLocalBrokerTransport } from "@scramjet/manager";
import { createVerser2HostOptions } from "./verser2-host-config";

const MANAGER_START_TIMEOUT = 30000;

const buildInfo = readJsonFile("build.info", __dirname, "..");
const packageFile = findPackage(__dirname).next();
const version = packageFile.value?.version || "unknown";
const name = packageFile.value?.name || "unknown";

export class MultiManager {
    apiServer: APIExpose;
    apiVerser?: Verser;
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
    multiHostControllerStore: MultiHostControllerStore = new MultiHostControllerStore();

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
        if (this.usesVerser2Transport()) {
            this.verser2Host = createVerserHost(createVerser2HostOptions(config.verser2));
        } else {
            this.apiVerser = new Verser(this.apiServer.server);
        }

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

        this.setRouting();

        this.apiVerser?.logger.pipe(this.logger);
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

            if (this.apiVerser) {
                this.attachVerserListeners();
            }
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

                    await this.attachManagerVerser2Broker(manager);

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

        this.apiServer.use(`${this.apiBase}/msth/:id`, (req, res) => this.forwardMultiHostRequest(req, res));

        this.apiServer.upstream(`${this.apiBase}/log`, this.commonLogsPipe.getOut());
        this.apiServer.upstream(`${this.apiBase}/audit`, (req, _res) => this.commonAuditPipe(req));
    }

    async commonAuditPipe(req: IncomingMessage) {
        await this.auditor.onAuditRequest(req);

        return this.auditor.output;
    }

    attachVerserListeners() {
        if (!this.apiVerser) {
            return;
        }

        this.apiVerser.on("connect", async (verserConnection: VerserConnection) => {
            this.logger.debug("Verser connect event");

            const hostId = verserConnection.getHeader("x-sth-id") as string;
            const multiHostId = verserConnection.getHeader("x-multihost-id") as string;

            verserConnection.addChannelListener((socket, data) => this.handleSTHRequest(socket, data));
            verserConnection.logger.pipe(this.logger);

            if (multiHostId) {
                this.logger.trace("MultiHost connection", multiHostId);
                this.attachMultiHostAPI(multiHostId, verserConnection);
            } else {
                this.logger.trace("Host connection", hostId);
                await this.attachHostAPI(hostId, verserConnection);
            }
        });

        this.apiVerser.on("close", (verserConnection: VerserConnection) => {
            this.logger.debug("Verser close event", verserConnection.getHeader("x-sth-id"));

            const hostId = verserConnection.getHeader("x-sth-id") as string;
            const multiHostId = verserConnection.getHeader("x-multihost-id") as string;

            if (multiHostId) {
                this.logger.trace("MultiHost connection closed", multiHostId);
                this.multiHostControllerStore.remove(multiHostId);
            } else {
                this.logger.trace("Host connection closed", hostId);
                const managerId = verserConnection.getHeader("x-manager-id") as string;
                const managerInstance = this.managersStore.getById(managerId);

                if (managerInstance) {
                    managerInstance.handleHostDisconnect(hostId, "disconnected");
                }
            }
        });
    }

    private usesVerser2Transport() {
        return this.config.verser2.enabled && this.config.verser2.migrationMode !== "legacy";
    }

    private async attachManagerVerser2Broker(manager: Manager) {
        if (!this.verser2Host || !manager.config.verser2.enabled || manager.config.verser2.migrationMode === "legacy") {
            return;
        }

        const broker = await this.verser2Host.attachLocalBroker({ brokerId: manager.config.verser2.localBroker.peerId });

        manager.setSthBrokerTransport(createManagerSthLocalBrokerTransport(broker));
    }

    async attachHostAPI(id: string, verserConnection: VerserConnection) {
        const managerId = verserConnection.getHeader("x-manager-id") as string;
        const managerInstance = this.managersStore.getById(managerId);

        this.logger.info(`Host API incoming connection with id "${id}" to manager with id "${managerId}".`);

        if (!managerInstance) {
            this.logger.error(`Host with id: ${id} trying to connect to non-existent manager with id ${managerId}.`);

            verserConnection.end(404);
        } else {
            await managerInstance.handleHostConnection(id, verserConnection);
        }
    }

    attachMultiHostAPI(id: string, verserConnection: VerserConnection) {
        this.logger.info(`MultiHost API incoming connection with id: ${id}.`);

        let instance = this.multiHostControllerStore.getById(id);

        if (instance?.isConnectionActive) {
            this.logger.warn(`Refusing MultiHost connection. MultiHost with ${id} already connected.`);
            verserConnection.end(409);
            return;
        }

        verserConnection.respond(202);

        if (instance) {
            instance.reconnect(verserConnection);
            this.logger.info("MultiHost reconnected", id);
        } else {
            instance = new MultiHostController(id, verserConnection);

            this.multiHostControllerStore.add(id, instance);
            instance.connect();
            this.logger.info("MultiHost connected", id);
        }

        this.commonLogsPipe.addInStream(instance.id, instance.logStream!);
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

    async forwardMultiHostRequest(req: ParsedMessage, res: ServerResponse) {
        const id = (req.params || {}).id;
        const controller = this.multiHostControllerStore.getById(id);

        this.logger.debug("Request to MultiHost", req.method, req.url);

        if (!controller) {
            res.writeHead(404);
            res.end();

            return;
        }

        req.url = req?.url?.replace(`${this.apiBase}/msth/${id}`, "");

        await controller.forward(req, res);
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

            await this.attachManagerVerser2Broker(manager);

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

    handleSTHRequest(socket: Duplex, data = Buffer.alloc(0)) {
        this.logger.debug("handleSTHRequest", data.toString());

        if (data.toString() !== "verser") {
            this.apiServer.server.emit("connection", socket);
        }
    }
}
