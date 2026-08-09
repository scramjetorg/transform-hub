import { PublicSTHConfiguration, STHConfiguration } from "@scramjet/api-types";
import { merge } from "@scramjet/utility";
import { defaultConfig as rawDefaultConfig } from "./default-config";
import { imageConfig } from "./image-config";
import { toPublicSTHConfig } from "./public-config";

// Merge image config into defaults at module load (same as original behavior)
merge(
    rawDefaultConfig as any,
    {
        docker: {
            prerunner: { image: imageConfig.prerunner },
            runnerImages: imageConfig.runner
        },
        kubernetes: {
            runnerImages: imageConfig.runner
        }
    } as any
);

export const defaultConfig = rawDefaultConfig;

export class ConfigService {
    private config: STHConfiguration;

    constructor(config?: Record<string, any>) {
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

    update(config: Record<string, any>) {
        merge(this.config, config);
    }

    async selectRuntimeAdapter() {
        let updateAdaptersConfig: ((runtimeAdapter: string, config: STHConfiguration) => Awaited<void>) | undefined;

        try {
            updateAdaptersConfig = (await import("@scramjet/adapters")).updateAdaptersConfig;
        } catch {
            // ignore
        }
        if (updateAdaptersConfig) {
            await updateAdaptersConfig(this.config.runtimeAdapter, this.config);
        }
    }

    static getConfigInfo(config: STHConfiguration): PublicSTHConfiguration {
        return toPublicSTHConfig(config);
    }
}
