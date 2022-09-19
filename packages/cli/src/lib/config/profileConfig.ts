import { normalizeUrl } from "@scramjet/utility";
import isJWT from "validator/lib/isJWT";
import isURL from "validator/lib/isURL";
import { configEnv, isConfigEnv, isConfigFormat, ProfileConfigEntity } from "../../types";
import { displayMessage } from "../output";
import { createProfileDirIfNotExists } from "../paths";
import DefaultFileConfig from "./defaultFileConfig";

// Profile configuration class. Represents configuration that can be maniupulated by user.
export default class ProfileConfig extends DefaultFileConfig {
    protected readOnlyConfig: boolean;

    constructor(configFile: string, readOnly: boolean = false) {
        const profileConfig: ProfileConfigEntity = {
            configVersion: 1,
            apiUrl: "http://127.0.0.1:8000/api/v1",
            middlewareApiUrl: "",
            env: "development",
            scope: "",
            token: "",
            log: {
                debug: false,
                format: "pretty",
            },
        };

        super(configFile, profileConfig);
        this.readOnlyConfig = readOnly;
    }
    getConfig(): ProfileConfigEntity {
        return super.getConfig();
    }

    get apiUrl() { return this.getConfig().apiUrl; }
    get middlewareApiUrl() { return this.getConfig().middlewareApiUrl; }
    get env() { return this.getConfig().env; }
    get scope() { return this.getConfig().scope; }
    get token() { return this.getConfig().token; }
    get debug() { return this.getConfig().log.debug; }
    get format() { return this.getConfig().log.format; }
    get path() { return this.filePath; }

    protected validateConfigPart(config: Object) {
        for (const [key, value] of Object.entries(config)) {
            if (!this.validateConfigValue(key, value)) return false;
        }
        return true;
    }

    validateConfig(config: any): boolean {
        if (typeof config !== "object" || typeof config?.log !== "object") return false;

        const configKeys = Object.keys(config);
        const configLogKeys = Object.keys(config.log);
        const profileKeys = Object.keys(this.defaultConfig);
        const profileLogKeys = Object.keys(this.defaultConfig.log);

        if (configKeys.length !== profileKeys.length || configLogKeys.length !== profileLogKeys.length) {
            displayMessage("Invalid number of keys in configuration");
            return false;
        }
        if (!profileKeys.every((key: any) => configKeys.includes(key)) ||
            !profileLogKeys.every((logKey: any) => configLogKeys.includes(logKey))) {
            displayMessage("Missing keys in configuration");
            return false;
        }

        return this.validateConfigPart(config);
    }

    set readOnly(readOnly: boolean) { this.readOnlyConfig = readOnly; }
    get readOnly() { return this.readOnlyConfig; }

    checkIfWritable() {
        if (this.readOnlyConfig) throw Error("Unable to write for read only configuration");
    }

    setConfig(config: any): boolean {
        this.checkIfWritable();
        if (typeof config !== "object" || !this.validateConfigPart(config)) return false;

        const { log: currentLog, ...currentConfig } = this.getConfig();
        const { log: newLog, ...newConfig } = config;
        const overlap = { ...currentConfig, ...newConfig, log: { ...currentLog, ...newLog } };

        return this.writeConfig(overlap);
    }

    getDefaultConfig(): ProfileConfigEntity {
        return super.getDefaultConfig();
    }
    getEnv(): configEnv {
        return this.getConfig().env;
    }

    writeConfig(config: any): boolean {
        createProfileDirIfNotExists();
        return super.writeConfig(config);
    }

    setConfigValue(key: string, value: any): boolean | void {
        const validValue = this.validateConfigValue(key, value);

        if (validValue) {
            const conf: any = this.getConfig();

            if (key === "log") {
                for (const [logKey, logValue] of Object.entries(value)) {
                    conf.log[logKey] = logValue;
                }
            } else conf[key] = value;

            this.writeConfig(conf);
            return true;
        }
        return validValue;
    }

    setApiUrl(apiUrl: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("apiUrl", normalizeUrl(apiUrl)) as boolean;
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
    setDebug(debug: boolean): boolean {
        this.checkIfWritable();
        return this.setConfigValue("log", { debug }) as boolean;
    }
    setFormat(format: string): boolean {
        this.checkIfWritable();
        return this.setConfigValue("log", { format }) as boolean;
    }

    // eslint-disable-next-line complexity
    validateConfigValue(key: string, value: any): boolean {
        if (!super.validateConfigValue(key, value)) return false;

        switch (key) {
            case "apiUrl":
                return isURL(value, {
                    protocols: ["http", "https"],
                    require_tld: false,
                    require_protocol: true,
                    require_port: true,
                    allow_underscores: true
                });
            case "log": {
                for (const [logKey, logValue] of Object.entries(value)) {
                    if (!this.validateConfigLogValue(logKey, logValue)) return false;
                }
                return true;
            }
            case "middlewareApiUrl": {
                if (value === this.defaultConfig.middlewareApiUrl) return true;
                return isURL(value);
            }
            case "env": return isConfigEnv(value);
            case "token": {
                if (value === this.defaultConfig.token) return true;
                return isJWT(value);
            }
            default:
                return true;
        }
    }
    validateConfigLogValue(key: string, value: any): boolean {
        type logConfigKey = keyof typeof this.defaultConfig.log;
        if (!(key in this.defaultConfig.log) || typeof value !== typeof this.defaultConfig.log[key as logConfigKey])
            return false;
        if (key === "format") return isConfigFormat(value);
        return true;
    }
}
