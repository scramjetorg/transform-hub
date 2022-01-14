import { existsSync, writeFileSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

/**
 * Default CLI configuration.
 */
const defaultConfig = {
    configVersion: 1,
    apiUrl: "http://127.0.0.1:8000/api/v1",
    log: true,
    format: "pretty",
    lastPackagePath: "",
    lastInstanceId: "",
    lastSequenceId: ""
};

/**
 *
 * @returns defaultConfig
 */
type Config = typeof defaultConfig;
const location = resolve(homedir(), ".sth-cli-rc.json");

let currentConfig: Config;

/**
 * Returns current configuration.
 * If configuration has not been loaded yet, it will be loaded from file.
 *
 * @returns Configuration.
 */
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
 *
 * @param {defaultConfig} key Property to be set.
 * @param {number | string | boolean} value Value to be set.
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

    try {
        writeFileSync(location, JSON.stringify(conf, null, 2), "utf-8");
    } catch (e) {
        // Just log info here.
        // eslint-disable-next-line no-console
        console.error("Warning: couldn't write config update");
    }
};

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
export const getSequenceId = (id: string) => getDashDefaultValue(id, getConfig().lastSequenceId);

/**
 * Gets last instance id if dash is provided, otherwise returns the first argument
 *
 * @param id - dash or anything else
 * @returns the correct id
 */
export const getInstanceId = (id: string) => getDashDefaultValue(id, getConfig().lastSequenceId);

/**
 * Gets package file path if dash is provided, otherwise returns the first argument
 *
 * @param path - dash or anything else
 * @returns the correct id
 */
export const getPackagePath = (path: string) => getDashDefaultValue(path, getConfig().lastPackagePath);

