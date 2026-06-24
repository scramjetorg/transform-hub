import { DeepPartial } from "@scramjet/runtime-types";
import { ManagerConfiguration } from "@scramjet/api-types";
import { merge } from "@scramjet/utility";
import { defaultConfig as managerDefaultConfig } from "./default-config";

class ConfigService {
    private config: ManagerConfiguration;

    constructor(config?: DeepPartial<ManagerConfiguration>) {
        this.config = managerDefaultConfig;

        if (config) {
            merge(this.config, config);
        }
    }

    getConfig() {
        return this.config;
    }

    update(config: DeepPartial<ManagerConfiguration>) {
        merge(this.config, config);
    }
}

export const configService = new ConfigService();
export const defaultConfig = managerDefaultConfig;
export const getDefaultConfig = (): ManagerConfiguration => JSON.parse(JSON.stringify(managerDefaultConfig));
