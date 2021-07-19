import { DeepPartial, STHConfiguration } from "@scramjet/types";

export const merge = <T extends Record<string, unknown>>(objTo: T, objFrom: DeepPartial<T>) => Object.keys(objFrom)
    .forEach((key: keyof T) => {
        if (typeof objFrom[key] === "object" && !Array.isArray(objFrom[key]))
            merge(objTo[key] as Record<string, unknown>, objFrom[key]!);
        else
            objTo[key] = objFrom[key] as T[keyof T];
    });

const defaultConfig: STHConfiguration = {
    docker: {
        prerunner: {
            image: "",
            maxMem: 128
        },
        runner: {
            image: "",
            maxMem: 512
        },
    },
    identifyExisting: false,
    host: {
        hostname: "localhost",
        port: 8000,
        apiBase: "/api/v1",
        socketPath: "/tmp/scramjet-socket-server-path"
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

        if (config) merge(this.config, config);
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
