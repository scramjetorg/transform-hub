import { normalizeUrl, ConfigFileDefault } from "@scramjet/utility";
import { configEnv, ProfileConfigEntity } from "../../types";
import { profileConfigDefault, validateProfileEntry, validateProfileKeysSize } from "./commonProfileConfig";

// Profile configuration class. Represents configuration that can be maniupulated by user.
export default class ProfileConfig extends ConfigFileDefault<ProfileConfigEntity> {
    protected readonly defaultConfiguration!: ProfileConfigEntity;

    constructor(configFile: string) {
        super(configFile, profileConfigDefault);
    }

    get apiUrl() { return this.get().apiUrl; }
    get middlewareApiUrl() { return this.get().middlewareApiUrl; }
    get env() { return this.get().env; }
    get scope() { return this.get().scope; }
    get token() { return this.get().token; }
    protected get log() { return this.get().log; }
    get debug() { return this.get().log.debug; }
    get format() { return this.get().log.format; }
    get path() { return this.file.path; }

    set(config: any): boolean {
        const { log: currentLog, ...currentConfig } = this.get();
        const { log: newLog, ...newConfig } = config;
        const overlap = { ...currentConfig, ...newConfig, log: { ...currentLog, ...newLog } };

        return super.set(overlap);
    }

    setApiUrl(apiUrl: string): boolean {
        return this.setEntry("apiUrl", normalizeUrl(apiUrl));
    }
    setMiddlewareApiUrl(middlewareApiUrl: string): boolean {
        return this.setEntry("middlewareApiUrl", normalizeUrl(middlewareApiUrl)) as boolean;
    }
    setEnv(env: configEnv): boolean {
        return this.setEntry("env", env);
    }
    setScope(scope: string): boolean {
        return this.setEntry("scope", scope);
    }
    setToken(token: string): boolean {
        return this.setEntry("token", token);
    }
    setDebug(debug: boolean): boolean {
        return this.setEntry("log", { ...this.log, debug });
    }
    setFormat(format: string): boolean {
        return this.setEntry("log", { ...this.log, format });
    }

    validate(config: Object): boolean {
        if (!validateProfileKeysSize(config))
            return false;
        return super.validate(config);
    }

    protected validateEntry(key: string, value: any): boolean | null {
        return validateProfileEntry(key, value);
    }
}
