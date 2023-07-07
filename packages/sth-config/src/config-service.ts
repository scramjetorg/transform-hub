import { DeepPartial, PublicSTHConfiguration, STHConfiguration } from "@scramjet/types";

import { merge } from "@scramjet/utility";
import path from "path";
import { homedir } from "os";

const imageConfig = require("./image-config.json");

const _defaultConfig: STHConfiguration = {
    logLevel: "TRACE",
    logColors: true,
    customName: "",
    description: "",
    tags: [],
    cpmUrl: "",
    cpmId: "",
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
    sequencesRoot: path.join(homedir(), ".scramjet_sequences"),
    kubernetes: {
        namespace: "default",
        authConfigPath: undefined,
        sthPodHost: undefined,
        runnerImages: {
            python3: "",
            node: "",
        },
        sequencesRoot: path.join(homedir(), ".scramjet_sequences"),
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
        status: true,
        adapter: "loki",
        environment: process.env.SCP_ENV_VALUE || "not-set",
        loki: {
            host: "https://analytics.scramjet.org/sth-usage",
            replaceTimestamp: true,
            labels: { module: "host", job: "telemetry" }
        }
    }
};

merge(_defaultConfig, {
    docker: {
        prerunner: { image: imageConfig.prerunner },
        runnerImages: imageConfig.runner,
    },
    kubernetes: {
        runnerImages: imageConfig.runner,
    }
});

export const defaultConfig = _defaultConfig;

export class ConfigService {
    private config: STHConfiguration;

    constructor(config?: DeepPartial<STHConfiguration>) {
        this.config = defaultConfig;

        if (config) {
            this.update(config);
        }
    }

    getConfig() {
        return this.config;
    }

    getDockerConfig() {
        return this.config.docker;
    }

    update(config: DeepPartial<STHConfiguration>) {
        merge(this.config, config);
    }

    static getConfigInfo(config: STHConfiguration): PublicSTHConfiguration {
        const {
            kubernetes: kubeFull,
            sequencesRoot: optionsSequencesRoot2,
            cpmSslCaPath: optionsCpmSslCaPath,
            ...safe
        } = config;

        const { authConfigPath: optionsAuthConfigPath, sequencesRoot: optionsSequencesRoot, ...kubernetes } = kubeFull;

        return { ...safe, kubernetes };
    }
}
