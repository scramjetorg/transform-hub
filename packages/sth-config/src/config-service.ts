import { DeepPartial, PublicSTHConfiguration, STHConfiguration } from "@scramjet/types";

import { merge } from "@scramjet/utility";
import { updateAdaptersConfig } from "@scramjet/adapters";
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
        updateAdaptersConfig(this.config.runtimeAdapter, this.config);
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
