import Config from "./config";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { createConfigDirIfNotExists } from "../paths";

export default abstract class FileConfig extends Config {
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
                throw new Error(`Parse error in config at ${this.filePath}.`);
            }
        return null;
    }
    writeConfig(config: any): boolean {
        try {
            createConfigDirIfNotExists();
            writeFileSync(this.filePath, JSON.stringify(config, null, 2), "utf-8");
            return true;
        } catch (e) {
            throw new Error(`Couldn't write config to ${this.filePath}`);
        }
    }
    setConfigValue(key: string, value: any): boolean | void {
        const validValue = this.validateConfigValue(key, value);

        if (validValue) {
            const conf = this.getConfig();

            conf[key] = value;
            return this.writeConfig(conf);
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
            return this.writeConfig(conf);
        }
        throw new Error(`Unknown config entry: ${key}`);
    }
}
