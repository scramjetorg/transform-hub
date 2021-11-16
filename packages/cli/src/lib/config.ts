import { existsSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const defaultConfig = {
    configVersion: 1,
    apiUrl: "http://127.0.0.1:8000/api/v1",
    log: true,
    format: "pretty"
};

/**
 *
 * @returns defaultConfig
 */
type Config = typeof defaultConfig;
const location = resolve(homedir(), "sth-cli-rc.json");

let currentConfig: Config;

export const getConfig = () => {
    if (currentConfig) return currentConfig;

    if (existsSync(location)) {
        try {
            const overlay = JSON.parse(readFileSync(location, "utf-8"));

            return { ...defaultConfig, ...overlay } as Config;
        } catch {
            // eslint-disable-next-line no-console
            console.error(`WARN: Parse error in config at ${location}.`);
        }
    }

    return defaultConfig;
};

/**
 * Set custom value for config and write it to JSON file.
 * @param key {defaultConfig} key
 * @param value {defaultConfig} value |
 * {defaultConfig.configVersion}, {defaultConfig.apiUrl}, {defaultConfig.logLevel}, {defaultConfig.format}
*/
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
