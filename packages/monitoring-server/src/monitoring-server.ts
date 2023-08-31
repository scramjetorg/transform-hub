import { createServer } from "http";
import { IMonitoringServer, MonitoringServerOptions } from "@scramjet/types";

export class MonitoringServer implements IMonitoringServer {
    private options: MonitoringServerOptions;
    constructor(options: MonitoringServerOptions) {
        this.options = options;
    }

    startServer() {
        const server = createServer(async (req, res) => {
            if (req.url === "/healtz" && req.method === "GET") {
                let ok = true;

                if (this.options.validator) {
                    try {
                        ok = await this.options.validator();
                    } catch (_e) {
                        res.statusCode = 500;
                        res.end();
                    }
                }

                res.setHeader("Content-type", "text/plain");
                if (ok) {
                    res.statusCode = 200;
                    res.end("ok");
                } else {
                    res.statusCode = 500;
                    res.end();
                }
            } else {
                res.statusCode = 404;
                res.end();
            }
        });

        server.listen(this.options.port);
    }
}
