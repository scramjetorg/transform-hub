import { DeepPartial } from "@scramjet/runtime-types";
import { ManagerConfiguration } from "@scramjet/api-types";
import { merge } from "@scramjet/utility";
import { managerDefaultConfig } from "./default-config";

export class ManagerConfigService {
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

export const managerConfigService = new ManagerConfigService();
export const getDefaultManagerConfig = (): ManagerConfiguration => JSON.parse(JSON.stringify(managerDefaultConfig));
