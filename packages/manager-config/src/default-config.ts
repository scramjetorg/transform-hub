import { ManagerConfiguration } from "@scramjet/types";
import { homedir } from "os";
import { join } from "path";

export const defaultConfig: ManagerConfiguration = {
    logColors: true,
    logLevel: "info",
    apiBase: "/api/v1",
    id: "cpm-manager",
    sthController: {
        unhealthyTimeoutMs: 61_000,
    },
    verser2: {
        enabled: true,
        host: {
            identityDir: join(homedir(), ".scramjet", "verser2-manager-host"),
            bindHost: "0.0.0.0",
            bindPort: 2443,
            publicUrl: "https://127.0.0.1:2443",
            tls: {
                mtlsRequired: false
            }
        },
        registration: {
            allowedClientFingerprints: []
        },
        localBroker: {
            peerId: "manager.cpm-manager.broker",
            routeDomain: "manager.cpm-manager.scramjet.internal"
        },
        localGuest: {
            peerId: "manager.cpm-manager.guest",
            routeDomain: "manager.cpm-manager.scramjet.internal"
        },
        timeouts: {
            routeReadinessMs: 10_000,
            leaseAcquireMs: 10_000,
            requestMs: 30_000
        },
        leases: {
            minimumWaitingLeases: 1
        }
    }
};
