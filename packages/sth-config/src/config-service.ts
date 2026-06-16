import { DeepPartial, PublicSTHConfiguration, STHConfiguration } from "@scramjet/types";
import { maskConfig, sthOutboundVerser2Options } from "@scramjet/config";

import { merge } from "@scramjet/utility";
import { defaultConfig as _defaultConfig } from "./default-config";

const imageConfig = require("./image-config.json");

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

    async selectRuntimeAdapter() {
        let updateAdaptersConfig: ((runtimeAdapter: string, config: STHConfiguration) => Awaited<void>) | undefined;

        try {
            updateAdaptersConfig = (await import("@scramjet/adapters")).updateAdaptersConfig;
        } catch (error) {
            // ignore
        }
        if (updateAdaptersConfig) {
            await updateAdaptersConfig(this.config.runtimeAdapter, this.config);
        }
    }

    static getConfigInfo(config: STHConfiguration): PublicSTHConfiguration {
        const {
            kubernetes: kubeFull,
            sequencesRoot: optionsSequencesRoot2,
            ...safe
        } = config;

        const { authConfigPath: optionsAuthConfigPath, sequencesRoot: optionsSequencesRoot, ...kubernetes } = kubeFull;
        const masked = maskConfig({ ...safe, kubernetes }, sthOutboundVerser2Options) as PublicSTHConfiguration;

        if (masked.platform?.apiKey) masked.platform.apiKey = "********";
        if (masked.couchdb?.pass) masked.couchdb.pass = "********";

        return masked;
    }
}
