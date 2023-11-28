import { createServer } from "http";
import { IMonitoringServer, MonitoringServerOptions, MonitoringServerValidator as MonitoringServerHealthCheck, MonitoringServerConfig } from "@scramjet/types";
import { MonitoringServerConf } from "./config/monitoringConfig";

export class MonitoringServer implements IMonitoringServer {
    private checks: MonitoringServerHealthCheck[] = [];
    private running = false;
    public serverOptions: MonitoringServerOptions;
    private monitoringSeverConf: MonitoringServerConf;

    constructor(serverOptions: MonitoringServerOptions) {
        const { check, ...config } = serverOptions;

        this.monitoringSeverConf = new MonitoringServerConf(config);

        const errors = this.monitoringSeverConf.errors;

        if (errors.length > 0) {
            throw new Error(errors.reduce((p: string[], c) => {
                p.push(c.message || "");
                return p;
            }, []).join());
        }

        this.serverOptions = serverOptions;

        if (!this.monitoringSeverConf.isValid()) {
            throw new Error("Invalid config");
        }

        this.serverOptions.path ||= "healtz";

        if ((/!^[a-zA-Z0-9\-_~:.@!$&'()*+,;=%]*$/).test(this.serverOptions.path)) {
            throw Error(`Invalid path: ${this.serverOptions.path}`);
        }

        if (Array.isArray(check)) {
            this.checks = check;
        }

        if (typeof this.serverOptions.check === "function") {
            this.checks.push(this.serverOptions.check);
        }
    }

    async handleHealtzRequest(): Promise<boolean> {
        return Promise.all(this.checks.map(v => v())).then(res => res.every(v => v === true), () => false);
    }

    start(): Promise<MonitoringServerConfig> {
        return new Promise<MonitoringServerConfig>((resolve, reject) => {
            if (this.running) reject("MonitoringServer already running");

            createServer(async (req, res) => {
                if (req.url === `/${this.serverOptions.path}` && req.method === "GET") {
                    const healtz = await this.handleHealtzRequest();

                    res.setHeader("Content-type", "text/plain");

                    if (healtz) {
                        res.statusCode = 200;
                        res.end("ok");

                        return;
                    }

                    res.statusCode = 500;
                    res.end();
                }
            }).listen(this.serverOptions.port, this.serverOptions.host, () => {
                this.running = true;

                resolve({
                    port: this.serverOptions.port,
                    host: this.serverOptions.host,
                    path: this.serverOptions.path
                });
            });
        });
    }
}
