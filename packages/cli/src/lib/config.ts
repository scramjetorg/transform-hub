import { existsSync, writeFileSync, readFileSync } from "fs";
import { globalConfigFile, sessionConfigFile } from "./paths";
import { configEnv, GlobalConfigEntity, SessionConfigEntity } from "../types";

abstract class Config {
    abstract getConfig(): any | null;
    abstract writeConfig(config: any): boolean;
    abstract setConfigValue(key: string, value: any): boolean | void;
    abstract getConfigValue(key: string): any;
    abstract delConfigValue(key: string): boolean;
    abstract keyExists(key: string): boolean;
    abstract validateConfigValue(key: string, value: any): boolean | void;
}

abstract class FileConfig extends Config {
    protected filePath: string;
    protected validPath: boolean;

    constructor(path: string) {
        super();
        this.filePath = path;
        this.validPath = existsSync(path);
    }
    setFilePath(path: string) {
        this.filePath = path;
        this.validPath = existsSync(path);
    }
    isValid() {
        return this.validPath;
    }
    getConfig() {
        if (this.validPath)
            try {
                return JSON.parse(readFileSync(this.filePath, "utf-8"));
            } catch {
                // eslint-disable-next-line no-console
                console.error(`WARN: Parse error in config at ${this.filePath}.`);
            }
        return null;
    }
    writeConfig(config: any): boolean {
        try {
            writeFileSync(this.filePath, JSON.stringify(config, null, 2), "utf-8");
            return true;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("WARN: Couldn't write config to ", this.filePath);
            return false;
        }
    }
    setConfigValue(key: string, value: any): boolean | void {
        const conf = this.getConfig();
        const validValue = this.validateConfigValue(key, value);

        if (validValue) {
            conf[key] = value;
            this.writeConfig(conf);
            return true;
        }
        return validValue;
    }
    getConfigValue(key: string) {
        if (this.keyExists(key)) return this.getConfig()[key];
        return undefined;
    }
    delConfigValue(key: string): boolean {
        const conf = this.getConfig();

        if (!conf) return false;
        if (this.keyExists(key)) {
            delete conf[key];
            this.writeConfig(conf);
            return true;
        }
        // eslint-disable-next-line no-console
        console.error(`WARN: Unknown config entry: ${key}`);
        return false;
    }
}

class DefaultFileConfig extends FileConfig {
    protected defaultConfig: any;

    constructor(path: string, defaultConf: any) {
        super(path);
        this.defaultConfig = defaultConf;
    }
    getConfig() {
        const fileConfig = super.getConfig();

        return fileConfig ? fileConfig : this.defaultConfig;
    }
    validateConfigValue(key: string, value: any): boolean {
        type defaultConfigKey = keyof typeof this.defaultConfig;
        return this.keyExists(key) && typeof value === typeof this.defaultConfig[key as defaultConfigKey];
    }
    keyExists(key: string): boolean {
        return key in this.defaultConfig;
    }
}

const JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;

class GlobalConfig extends DefaultFileConfig {
    constructor() {
        const defaultGlobalConfig: GlobalConfigEntity = {
            configVersion: 1,
            apiUrl: "http://127.0.0.1:8000/api/v1",
            log: true,
            format: "pretty",
            middlewareApiUrl: "",
            env: "development",
            scope: "",
            token: "",
        };

        super(globalConfigFile, defaultGlobalConfig);
    }
    getConfig(): GlobalConfigEntity {
        return super.getConfig();
    }
    getEnv(): configEnv {
        return this.getConfig().env;
    }
    isDevelopmentEnv(env: configEnv): boolean {
        return env === "development";
    }
    isProductionEnv(env: configEnv): boolean {
        return env === "production";
    }

    setApiUrl(apiUrl: string): boolean {
        return this.setConfigValue("apiUrl", apiUrl) as boolean;
    }
    setLog(log: boolean): boolean {
        return this.setConfigValue("log", log) as boolean;
    }
    setFormat(format: string): boolean {
        return this.setConfigValue("format", format) as boolean;
    }
    setMiddlewareApiUrl(middlewareApiUrl: string): boolean {
        return this.setConfigValue("middlewareApiUrl", middlewareApiUrl) as boolean;
    }
    setEnv(env: configEnv): boolean {
        return this.setConfigValue("env", env) as boolean;
    }
    setScope(scope: string): boolean {
        return this.setConfigValue("scope", scope) as boolean;
    }
    setToken(token: string): boolean {
        return this.setConfigValue("token", token) as boolean;
    }

    validateConfigValue(key: string, value: any): boolean {
        const valid = super.validateConfigValue(key, value);

        if (key === "token" && valid) {
            const token = value as GlobalConfigEntity["token"];

            return Boolean(token.match(JWS_REGEX));
        }
        return valid;
    }
}

class SessionConfig extends DefaultFileConfig {
    constructor() {
        const defaultSessionConfig: SessionConfigEntity = {
            apiUrl: new GlobalConfig().getConfig().apiUrl,
            lastPackagePath: "",
            lastInstanceId: "",
            lastSequenceId: "",
            lastSpaceId: "",
            lastHubId: "",
            scope: "",
        };

        super(sessionConfigFile, defaultSessionConfig);
    }
    getConfig(): SessionConfigEntity {
        return super.getConfig();
    }
    setApiUrl(apiUrl: string): boolean {
        return this.setConfigValue("apiUrl", apiUrl) as boolean;
    }
    setLastPackagePath(lastPackagePath: string): boolean {
        return this.setConfigValue("lastPackagePath", lastPackagePath) as boolean;
    }
    setLastInstanceId(lastInstanceId: string): boolean {
        return this.setConfigValue("lastInstanceId", lastInstanceId) as boolean;
    }
    setLastSequenceId(lastSequenceId: string): boolean {
        return this.setConfigValue("lastSequenceId", lastSequenceId) as boolean;
    }
    setLastSpaceId(lastSpaceId: string): boolean {
        return this.setConfigValue("lastSpaceId", lastSpaceId) as boolean;
    }
    setLastHubId(lastHubId: string): boolean {
        return this.setConfigValue("lastHubId", lastHubId) as boolean;
    }
    setScope(scope: string): boolean {
        return this.setConfigValue("scope", scope) as boolean;
    }
}

export const globalConfig = new GlobalConfig();
export const sessionConfig = new SessionConfig();

const getDashDefaultValue = (id: string, def: string) => {
    if (id !== "-") return id;

    if (!def) throw new Error("Previous value isn't said - you can't use '-' to replace it.");
    return def;
};

/**
 * Gets last sequence id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getSequenceId = (id: string) => getDashDefaultValue(id, sessionConfig.getConfig().lastSequenceId);

/**
 * Gets last instance id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getInstanceId = (id: string) => getDashDefaultValue(id, sessionConfig.getConfig().lastInstanceId);

/**
 * Gets package file path if dash is provided, otherwise returns the first argument
 *
 * @param path - dash or anything else
 * @returns the correct id
 */
export const getPackagePath = (path: string) => getDashDefaultValue(path, sessionConfig.getConfig().lastPackagePath);
