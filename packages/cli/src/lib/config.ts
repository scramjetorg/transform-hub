import { existsSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const defaultConfig = {
    configVersion: 1,
    apiUrl: "http://127.0.0.1:8000/api/v1",
    logLevel: "trace"
};

type Config = typeof defaultConfig;
const location = resolve(homedir(), ".scramjetrc");

let currentConfig: Config;

export const getConfig = () => {
    if (currentConfig) return currentConfig;
    if (existsSync(location)) {
        try {
            const overlay = JSON.parse(readFileSync(location, "utf-8"));

            return { ...defaultConfig, ...overlay } as Config;
        } catch {
            console.error(`WARN: Parse error in config at ${location}.`);
        }
    }

    return defaultConfig;
};

export const setConfigValue = (key: keyof Config, value: number | string | boolean) => {
    const conf = getConfig();

    if (
        Object.prototype.hasOwnProperty.call(defaultConfig, key) &&
        typeof value === typeof defaultConfig[key]
    ) {
        if (typeof defaultConfig[key] === "boolean")
            conf[key] = Boolean(value) as never;
        else if (typeof defaultConfig[key] === "string")
            conf[key] = value.toString() as never;
        else if (typeof defaultConfig[key] === "number")
            conf[key] = Number(value) as never;
    } else {
        throw new Error(`Unknown config entry: ${key}`);
    }

    writeFileSync(location, JSON.stringify(conf, null, 2), "utf-8");
};
