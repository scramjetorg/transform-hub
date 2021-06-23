import { HostConfiguration, PartialHostConfiguration } from "@scramjet/types";

const defaultConfig: HostConfiguration = {
    docker: {
        prerunner: {
            image: "repo.int.scp.ovh/scramjet/pre-runner:0.10.0-pre.8",
            maxMem: 128
        },
        runner: {
            image: "repo.int.scp.ovh/scramjet/runner:0.10.0-pre.8",
            maxMem: 512
        }
    },
    host: {
        port: 8000,
        apiSocket: "f",
        apiBase: "/api/v1"
    }
};

class ConfigService {
    private config: HostConfiguration;

    constructor(config?: PartialHostConfiguration) {
        this.config = Object.assign(defaultConfig, config);
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
