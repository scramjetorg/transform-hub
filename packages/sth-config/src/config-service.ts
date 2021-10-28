import { DeepPartial, STHConfiguration } from "@scramjet/types";

import { merge } from "@scramjet/utility";

const defaultConfig: STHConfiguration = {
    cpmUrl: "",
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
    },
    identifyExisting: false,
    host: {
        hostname: "localhost",
        port: 8000,
        apiBase: "/api/v1",
        socketPath: "/tmp/scramjet-socket-server-path",
        infoFilePath: "/tmp/sth-id.json"
    },
    instanceRequirements: {
        freeMem: 256,
        cpuLoad: 10,
        freeSpace: 128
    },
    safeOperationLimit: 512
};

class ConfigService {
    private config: STHConfiguration;

    constructor(config?: DeepPartial<STHConfiguration>) {
        this.config = defaultConfig;
        this.updateImages();

        if (config) {
            merge(this.config, config);
        }
    }

    updateImages() {
        const imageConfig = require("./image-config.json");

        this.config.docker.prerunner.image = imageConfig.prerunner;
        this.config.docker.runner.image = imageConfig.runner;
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
}

export const configService = new ConfigService();
