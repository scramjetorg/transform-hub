import isJWT from "validator/lib/isJWT";
import isURL from "validator/lib/isURL";
import { isConfigEnv, isConfigFormat, ProfileConfigEntity } from "../../types";
import { displayMessage } from "../output";

export const profileConfigDefault: ProfileConfigEntity = {
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

export const validateProfileKeysSize = (config: Object) => {
    const configKeys = Object.keys(config);
    const profileKeys = Object.keys(profileConfigDefault);

    if (configKeys.length !== profileKeys.length) {
        displayMessage("Invalid number of keys in configuration");
        return false;
    }
    if (!profileKeys.every((key: any) => configKeys.includes(key))) {
        displayMessage("Missing keys in configuration");
        return false;
    }
    for (const key in config) {
        if (!(key in profileConfigDefault &&
             typeof config[key as keyof Object] === typeof profileConfigDefault[key as keyof ProfileConfigEntity]))
            return false;
    }
    return true;
};

const validateConfigLogValue = (key: string, value: any): boolean | null => {
    type logConfigKey = keyof typeof profileConfigDefault.log;
    if (!(key in profileConfigDefault.log) ||
     typeof value !== typeof profileConfigDefault.log[key as logConfigKey])
        return false;
    if (key === "format") return isConfigFormat(value);
    return true;
};

// eslint-disable-next-line complexity
export const validateProfileEntry = (key: string, value: any,): boolean | null => {
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
                if (!validateConfigLogValue(logKey, logValue)) return false;
            }
            return true;
        }
        case "middlewareApiUrl": {
            if (value === profileConfigDefault.middlewareApiUrl) return true;
            return isURL(value);
        }
        case "env": return isConfigEnv(value);
        case "token": {
            if (value === profileConfigDefault.token) return true;
            return isJWT(value);
        }
        default:
            return null;
    }
};
