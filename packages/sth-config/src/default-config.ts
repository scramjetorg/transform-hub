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
    sequencesRoot: join(homedir(), ".scramjet_sequences"),
    kubernetes: {
        namespace: "default",
        authConfigPath: undefined,
        sthPodHost: undefined,
        runnerImages: {
            python3: "",
            node: "",
        },
        sequencesRoot: join(homedir(), ".scramjet_sequences"),
        timeout: "0"
    },
    startupConfig: "",
    exitWithLastInstance: false,
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
    }
};
