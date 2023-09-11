import { createServer } from "http";
import { IMonitoringServer, MonitoringServerOptions, MonitoringServerValidator as MonitoringServerHealthCheck } from "@scramjet/types";

export class MonitoringServer implements IMonitoringServer {
    private options: MonitoringServerOptions;
    private checks: MonitoringServerHealthCheck[] = [];

    constructor(options: MonitoringServerOptions) {
        this.options = options;

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

    start() {
        createServer(async (req, res) => {
            if (req.url === "/healtz" && req.method === "GET") {
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
        }).listen(this.options.port);
    }
}
