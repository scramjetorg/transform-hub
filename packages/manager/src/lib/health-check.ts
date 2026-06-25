import net from "net";
import { MRestAPI } from "@scramjet/api-types";

export class HealthCheck {
    sthServer: net.Server;

    constructor(sthServer: net.Server,) {
        this.sthServer = sthServer;
    }

    public getHealthCheckInfo(): MRestAPI.HealthCheckInfo {
        return {
            uptime: process.uptime(),
            timestamp: Date.now(),
            modules: {
                sthServer: this.sthServer.listening
            }
        };
    }
}
