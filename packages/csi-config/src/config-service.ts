import { HostConfiguration, PartialHostConfiguration } from "@scramjet/types";


const merge = (objFrom: any, objTo: any) => Object.keys(objFrom)
    .reduce(
        (merged, key) => {
            merged[key] = typeof merged[key] !== "undefined" && objFrom[key] instanceof Object && !Array.isArray(objFrom[key])
                ? merge(objFrom[key], merged[key] ?? {})
                : objFrom[key];
            return merged;
        }, { ...objTo }
    );
//
const defaultConfig: HostConfiguration = {
    docker: {
        prerunner: {
            image: "",
            maxMem: 128
        },
        runner: {
            image: "",
            maxMem: 512
        }
    },
    host: {
        hostname: "localhost",
        port: 8000,
        apiBase: "/api/v1",
        socketPath: "/tmp/scramjet-socket-server-path"
    }
};

class ConfigService {
    private config: HostConfiguration;

    constructor(config?: PartialHostConfiguration) {
        this.config = defaultConfig;
        this.updateImages();
        Object.assign(this.config, config);
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

    update(config: PartialHostConfiguration) {
        merge(this.config, config);
    }
}

export const configService = new ConfigService();
