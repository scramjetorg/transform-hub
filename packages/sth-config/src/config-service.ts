import { DeepPartial, PublicSTHConfiguration, STHConfiguration } from "@scramjet/types";
import { merge } from "@scramjet/utility";
import path from "path";
import { homedir } from "os";

const imageConfig = require("./image-config.json");

const _defaultConfig: STHConfiguration = {
    logLevel: "TRACE",
    logColors: true,
    cpmUrl: "",
    cpmId: "",
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
        hostname: "0.0.0.0",
        port: 8000,
        apiBase: "/api/v1",
        instancesServerPort: 8001,
        infoFilePath: "/tmp/sth-id.json"
    },
    instanceRequirements: {
        freeMem: 256,
        cpuLoad: 10,
        freeSpace: 128
    },
    safeOperationLimit: 512,
    instanceAdapterExitDelay: 9000,
    runtimeAdapter: "docker",
    sequencesRoot: path.join(homedir(), ".scramjet_sequences"),
    kubernetes: {
        namespace: "default",
        authConfigPath: undefined,
        sthPodHost: undefined,
        runnerImages: {
            python3: "",
            node: "",
        },
        sequencesRoot: path.join(homedir(), ".scramjet_k8s_sequences"),
        timeout: "0"
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
            merge(this.config, config);
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
