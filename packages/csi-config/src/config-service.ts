import { HostConfiguration, PartialHostConfiguration } from "@scramjet/types";

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
        Object.assign(this.config, config);
    }
}

export const configService = new ConfigService();
