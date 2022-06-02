import { existsSync, writeFileSync, readFileSync } from "fs";
import { normalizeUrl } from "@scramjet/utility";
import { createSessionDirIfNotExists, defaultConfigName, defaultConfigProfileFile, profileExists, profileNameToPath, sessionConfigFile, siConfigFile } from "./paths";
import { configEnv, isConfigEnv, isConfigFormat, ProfileConfigEntity, SiConfigEntity, SessionConfigEntity } from "../types";
import isUrl from "validator/lib/isURL";
import isJWT from "validator/lib/isJWT";
import { envs } from "../utils/envs";
import { displayError } from "./output";

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
    getDefaultConfig() {
        return this.defaultConfig;
    }

    validateConfigValue(key: string, value: any): boolean {
        type defaultConfigKey = keyof typeof this.defaultConfig;
        return this.keyExists(key) && typeof value === typeof this.defaultConfig[key as defaultConfigKey];
    }
    keyExists(key: string): boolean {
        return key in this.defaultConfig;
    }
}

// Config class for internal use only
export class SiConfig extends DefaultFileConfig {
    constructor(configFile: string) {
        const siDefaultConfig: SiConfigEntity = {
            profile: "",
        };

        super(configFile, siDefaultConfig);
        if (this.isValid()) return;
        else if (this.writeConfig(siDefaultConfig))
            this.setFilePath(configFile);
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

export const siConfig = new SiConfig(siConfigFile);

export class ProfileConfig extends DefaultFileConfig {
    protected readOnlyConfig: boolean;

    constructor(configFile: string, readOnly: boolean = false) {
        const profileConfig: ProfileConfigEntity = {
            configVersion: 1,
            apiUrl: "http://127.0.0.1:8000/api/v1",
            debug: false,
            format: "pretty",
            middlewareApiUrl: "",
            env: "development",
            scope: "",
            token: "",
        };

        super(configFile, profileConfig);
        this.readOnlyConfig = readOnly;
    }
    getConfig(): ProfileConfigEntity {
        return super.getConfig();
    }
    validateConfig(config: any) {
        if (typeof config !== "object") return false;
        if (config.length !== this.defaultConfig.length) return false;
        for (const [key, value] of Object.entries(config)) {
            if (!this.validateConfigValue(key, value)) return false;
        }
        return true;
    }
    set readOnly(readOnly: boolean) { this.readOnlyConfig = readOnly; }
    get readOnly() { return this.readOnlyConfig; }

    checkIfWritable() { if (this.readOnlyConfig) throw Error("Unable to write for read only configuration"); }
    setConfig(config: any): boolean {
        this.checkIfWritable();
        if (!this.validateConfig(config)) return false;
        const overlap = { ...this.getConfig(), ...config };

        return this.writeConfig(overlap);
    }

    getDefaultConfig(): ProfileConfigEntity {
        return super.getDefaultConfig();
    }
    getEnv(): configEnv {
        return this.getConfig().env;
    }

    setApiUrl(apiUrl: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("apiUrl", normalizeUrl(apiUrl)) as boolean;
    }
    setDebug(debug: boolean): boolean {
        this.checkIfWritable();
        return this.setConfigValue("debug", debug) as boolean;
    }
    setFormat(format: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("format", format) as boolean;
    }
    setMiddlewareApiUrl(middlewareApiUrl: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("middlewareApiUrl", normalizeUrl(middlewareApiUrl)) as boolean;
    }
    setEnv(env: configEnv): boolean {
        this.checkIfWritable();
        return this.setConfigValue("env", env) as boolean;
    }
    setScope(scope: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("scope", scope) as boolean;
    }
    setToken(token: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("token", token) as boolean;
    }

    validateConfigValue(key: string, value: any): boolean {
        const valid = super.validateConfigValue(key, value);

        if (!valid) {
            return false;
        }
        switch (key) {
            case "apiUrl": return isUrl(value);
            case "format": return isConfigFormat(value);
            case "middlewareApiUrl": {
                if (value === this.defaultConfig.middlewareApiUrl) return true;
                return isUrl(value);
            }
            case "env" : return isConfigEnv(value);
            case "token": {
                if (value === this.defaultConfig.token) return true;
                return isJWT(value);
            }
            default:
                return true;
        }
    }
}

class SessionConfig extends DefaultFileConfig {
    constructor() {
        const defaultSessionConfig: SessionConfigEntity = {
            lastPackagePath: "",
            lastInstanceId: "",
            lastSequenceId: "",
            lastSpaceId: "",
            lastHubId: "",
        };

        super(sessionConfigFile, defaultSessionConfig);
    }
    getConfig(): SessionConfigEntity {
        return super.getConfig();
    }
    getDefaultConfig(): SessionConfigEntity {
        return super.getDefaultConfig();
    }
    writeConfig(config: any): boolean {
        createSessionDirIfNotExists();
        return super.writeConfig(config);
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
}

const profileSource = {
    default: 1,
    config: 2,
    envProfile: 3,
    envProfilePath: 4,
    flagProfile: 5,
    flagProfilePath: 6,
} as const;

type ProfileSourceKeys = keyof typeof profileSource;
type ProfileSourceValues = typeof profileSource[ProfileSourceKeys];

export class ProfileManager {
    protected source: ProfileSourceValues;
    protected profile: ProfileConfig;

    constructor() {
        this.source = profileSource.default;
        this.profile = new ProfileConfig(defaultConfigProfileFile);
    }
    isPathSource() {
        return this.source === profileSource.envProfilePath || this.source === profileSource.flagProfilePath;
    }
    getProfileName():string {
        if (this.isPathSource())
            return "user configuration file";
        return siConfig.getConfig().profile;
    }
    setFlagProfilePathSource() {
        this.source = profileSource.flagProfilePath;
    }
    getProfileConfig(): ProfileConfig {
        return this.profile;
    }
    setDefaultProfile() {
        if (!this.validSourcePrecedence(profileSource.default)) return;
        this.source = profileSource.default;
        this.profile.setFilePath(defaultConfigProfileFile);
    }
    setConfigProfile(name: string) {
        if (!this.validSourcePrecedence(profileSource.config)) return;
        if (this.setProfileFromName(name)) this.source = profileSource.config;
    }
    setEnvProfile(name: string) {
        if (!this.validSourcePrecedence(profileSource.envProfile)) return;
        if (this.setProfileFromName(name)) this.source = profileSource.envProfile;
    }
    setEnvProfilePath(path: string) {
        if (!this.validSourcePrecedence(profileSource.envProfilePath)) return;
        if (this.setProfileFromFile(path)) this.source = profileSource.envProfilePath;
    }
    setFlagProfile(name: string) {
        if (!this.validSourcePrecedence(profileSource.flagProfile)) return;
        if (this.setProfileFromName(name)) this.source = profileSource.flagProfile;
    }
    setFlagProfilePath(path: string) {
        if (!this.validSourcePrecedence(profileSource.flagProfilePath)) return;
        if (this.setProfileFromFile(path)) this.source = profileSource.flagProfilePath;
    }

    protected validSourcePrecedence(incomingSource: ProfileSourceValues) {
        return incomingSource >= this.source;
    }

    protected setProfileFromName(profileName: string):boolean {
        if (!profileExists(profileName)) throw Error(`Unable to find profile: ${profileName}`);
        this.profile.readOnly = false;
        this.profile.setFilePath(profileNameToPath(profileName));
        return true;
    }

    protected setProfileFromFile = (path:string):boolean => {
        const fileConfig = JSON.parse(readFileSync(path, "utf-8"));

        if (!this.profile.validateConfig(fileConfig)) throw Error("Invalid config file");
        this.profile.readOnly = true;
        this.profile.setFilePath(path);
        return true;
    };
}

export const profileManager = new ProfileManager();
export const profileConfig = profileManager.getProfileConfig();

const createDefaultProfileIfNotExist = () => {
    const defaultProfile = new ProfileConfig(defaultConfigProfileFile);

    if (defaultProfile.isValid()) return;
    defaultProfile.writeConfig(defaultProfile.getDefaultConfig());
    defaultProfile.setFilePath(defaultConfigProfileFile);
};

export const initConfig = () => {
    createDefaultProfileIfNotExist();
    let { profile } = siConfig.getConfig();

    try {
        if (!profile || !profileExists(profile)) {
            siConfig.setProfile(defaultConfigName);
            profile = defaultConfigName;
        }
    } catch (e: any) {
        displayError(e);
    }

    if (envs.siConfigPathEnv) profileManager.setEnvProfilePath(envs.siConfigPathEnv);
    else if (envs.siConfigEnv) profileManager.setEnvProfile(envs.siConfigEnv);
    else profileManager.setConfigProfile(profile);
};

export const sessionConfig = new SessionConfig();

const getDashDefaultValue = (id: string, def: string) => {
    if (id !== "-") return id;

    if (!def) throw new Error("Previous value isn't said - you can't use '-' to replace it.");
    return def;
};

/**
 * Gets last Sequence id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getSequenceId = (id: string) => getDashDefaultValue(id, sessionConfig.getConfig().lastSequenceId);

/**
 * Gets last Instance id if dash is provided, otherwise returns the first argument
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
