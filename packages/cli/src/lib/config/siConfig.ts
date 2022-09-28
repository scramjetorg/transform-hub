import { SiConfigEntity } from "../../types";
import { siConfigFile } from "../paths";
import DefaultFileConfig from "./defaultFileConfig";

// Global configuration class for internal use only
class SiConfig extends DefaultFileConfig {
    private static instance: SiConfig;

    private constructor(configFile: string) {
        const siDefaultConfig: SiConfigEntity = {
            profile: "",
        };

        super(configFile, siDefaultConfig);
        if (this.isValid()) return;
        else if (this.writeConfig(siDefaultConfig))
            this.setFilePath(configFile);
    }

    static getInstance(): SiConfig {
        if (!SiConfig.instance) {
            SiConfig.instance = new SiConfig(siConfigFile);
        }
        return SiConfig.instance;
    }

    getConfig(): SiConfigEntity {
        return super.getConfig();
    }
    setProfile(profile: string) {
        return this.setConfigValue("profile", profile) as boolean;
    }

    validateConfigValue(key: string, value: any): boolean {
        return super.validateConfigValue(key, value);
    }
}

export const siConfig = SiConfig.getInstance();
