import { createServer } from "http";
import { IMonitoringServer, MonitoringServerOptions, MonitoringServerValidator as MonitoringServerHealthCheck, MonitoringServerConfig } from "@scramjet/types";

export class MonitoringServer implements IMonitoringServer {
    private options: MonitoringServerOptions;
    private checks: MonitoringServerHealthCheck[] = [];
    private running = false;

    constructor(options: MonitoringServerOptions) {
        if (!Number.isInteger(options.port) || (options.port < 0 || options.port > 65535)) {
            throw Error(`Invalid port number ${options.port}`);
        }

        this.options = options;

        this.options.path ||= "healtz";

        if ((/!^[a-zA-Z0-9\-_~:.@!$&'()*+,;=%]*$/).test(this.options.path)) {
            throw Error(`Invalid path: ${this.options.path}`);
        }

        if (Array.isArray(options.check)) {
            this.checks = options.check;
        }

        if (typeof this.options.check === "function") {
            this.checks.push(this.options.check);
        }
    }

    async handleHealtzRequest(): Promise<boolean> {
        return Promise.all(this.checks.map(v => v())).then(res => res.every(v => v === true), () => false);
    }

    start(): Promise<MonitoringServerConfig> {
        return new Promise<MonitoringServerConfig>((resolve, reject) => {
            if (this.running) reject("MonitoringServer already running");

            createServer(async (req, res) => {
                if (req.url === `/${this.options.path}` && req.method === "GET") {
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
            }).listen(this.options.port, this.options.host, () => {
                this.running = true;

                resolve({
                    port: this.options.port,
                    host: this.options.host,
                    path: this.options.path
                });
            });
        });
    }
}
