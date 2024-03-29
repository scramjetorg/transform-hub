import { ConfigFileDefault } from "@scramjet/utility";
import { SiConfigEntity } from "../../types";
import { siConfigFile } from "../paths";

// Global configuration class for internal use only
export class SiConfig extends ConfigFileDefault<SiConfigEntity> {
    // eslint-disable-next-line no-use-before-define
    private static instance: SiConfig;

    private constructor(configFile: string) {
        const siDefaultConfig: SiConfigEntity = {
            profile: "default",
        };

        super(configFile, siDefaultConfig);
        if (!this.fileExist()) {
            this.restoreDefault();
        }
    }

    static getInstance(): SiConfig {
        if (!SiConfig.instance) {
            SiConfig.instance = new SiConfig(siConfigFile);
        }
        return SiConfig.instance;
    }

    get profile() {
        return this.get().profile;
    }
    setProfile(profile: string) {
        return this.setEntry("profile", profile);
    }
    protected validateEntry(key: string, value: any): boolean | null {
        if (key !== "profile" && typeof value === "string") return false;
        return true;
    }
}

