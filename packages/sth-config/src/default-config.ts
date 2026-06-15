import { STHConfiguration } from "@scramjet/types";
import { homedir } from "os";
import { join } from "path";

export const defaultConfig: STHConfiguration = {
    logLevel: "TRACE",
    logColors: true,
    customName: "",
    description: "",
    tags: [],
    cpmUrl: "",
    cpmId: "",
    adapters: {},
    cpm: {
        maxReconnections: 100,
        reconnectionDelay: 2000,
    },
    debug: false,
    docker: {
        prerunner: {
            image: "",
            maxMem: 128,
        },
        runner: {
            image: "",
            maxMem: 512,
            exposePortsRange: [30000, 32767],
            hostIp: "0.0.0.0"
        },
        runnerImages: {
            python3: "",
            node: "",
            bun: "",
        },
    },
    identifyExisting: false,
    host: {
        apiBase: "/api/v1",
        infoFilePath: "/tmp/sth-id.json",
        instancesServerPort: 8001,
        hostname: "::",
        port: 8000,
        federationControl: false
    },
    instanceRequirements: {
        cpuLoad: 10,
        freeMem: 256,
        freeSpace: 128
    },
    safeOperationLimit: 512,
    runtimeAdapter: "detect",
    localStorageAdapter: "file",
    localStoragePath: "",
    sequencesRoot: join(homedir(), ".scramjet_sequences"),
    kubernetes: {
        namespace: "default",
        authConfigPath: undefined,
        sthPodHost: undefined,
        runnerImages: {
            python3: "",
            node: "",
            bun: "",
        },
        sequencesRoot: join(homedir(), ".scramjet_sequences"),
        timeout: 0
    },
    startupConfig: "",
    killOnExit: false,
    exitWithLastInstance: false,
    strictPlatformConnection: false,
    verser2: {
        enabled: false,
        migrationMode: "verser2",
        hostUrl: "https://127.0.0.1:2443",
        broker: {
            peerId: "sth.default.broker",
            targetDomain: "manager.cpm-manager.scramjet.internal"
        },
        guest: {
            peerId: "sth.default.guest",
            routeDomain: "sth.default.scramjet.internal"
        },
        tls: {},
        enrollment: {},
        timeouts: {
            routeReadinessMs: 10_000,
            leaseAcquireMs: 10_000,
            requestMs: 30_000
        },
        leases: {
            minimumWaitingLeases: 1
        }
    },
    timings: {
        heartBeatInterval: 10000,
        instanceLifetimeExtensionDelay: 180e3,
        instanceAdapterExitDelay: 9000,
    },
    telemetry: {
        status: false,
        adapter: "loki",
        environment: process.env.SCP_ENV_VALUE || "not-set",
        loki: {
            host: "https://analytics.scramjet.org/sth-usage",
            replaceTimestamp: true,
            labels: { module: "host", job: "telemetry" }
        }
    },
    instanceReconnect: false,
    couchdb: {
        url: "http://localhost:5984",
        dbName: "localstorage",
        user: "",
        pass: ""
    },
};
