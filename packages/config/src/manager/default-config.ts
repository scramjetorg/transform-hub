import { ManagerConfiguration } from "@scramjet/api-types";
import { homedir } from "os";
import { join } from "path";

export const managerDefaultConfig: ManagerConfiguration = {
    logColors: true,
    logLevel: "info",
    apiBase: "/api/v1",
    id: "cpm-manager",
    csrEnrollment: {
        enabled: false,
        redemptionPath: "/api/v2/enrollment/redeem"
    },
    sthController: {
        unhealthyTimeoutMs: 61_000
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
        controlIngress: {
            // The optional mTLS control listener reserves 2444. Hub runner Hosts
            // default to 2445, so explicitly enabling this listener is locally safe.
            enabled: false,
            host: {
                identityDir: join(homedir(), ".scramjet", "verser2-manager-control-ingress"),
                bindHost: "0.0.0.0",
                bindPort: 2444,
                publicUrl: "https://127.0.0.1:2444",
                tls: { mtlsRequired: true }
            },
            guest: {
                peerId: "manager.cpm-manager.control.guest",
                routeDomain: "manager.cpm-manager.control.scramjet.internal"
            }
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
