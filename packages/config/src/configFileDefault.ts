import { ConfigFile } from "./configFile";

/**
 * Modifiable configuration object held in file. If file
 * is invalid, or not existing, default configuration is used.
 */
export abstract class ConfigFileDefault extends ConfigFile {
    protected readonly defaultConfiguration: object;

    constructor(filePath: string, defaultConf: Object) {
        super(filePath);
        this.defaultConfiguration = defaultConf;
    }
    get(): Object {
        if (!this.isValid())
            return this.defaultConfiguration;
        return super.get();
    }
    getDefault(): Object {
        return this.defaultConfiguration;
    }
    restoreDefault(): boolean {
        if (!this.file.write(this.defaultConfiguration)) return false;
        this.isValidConfig = true;
        this.configuration = this.defaultConfiguration;
        return true;
    }
}
