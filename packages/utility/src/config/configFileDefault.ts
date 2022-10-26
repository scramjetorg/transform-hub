import { ConfigFile } from "./configFile";

/**
 * Modifiable configuration object held in file. If file
 * is invalid, or not existing, default configuration is used.
 */
export abstract class ConfigFileDefault<Type extends Object> extends ConfigFile<Type> {
    protected readonly defaultConfiguration: Type;

    constructor(filePath: string, defaultConf: Type) {
        super(filePath);
        this.defaultConfiguration = defaultConf;
    }
    /**
     * @returns File configuration if valid, default configuration otherwise
     */
    get(): Type {
        if (!this.isValid())
            return this.defaultConfiguration;
        return super.get();
    }
    getDefault(): Type {
        return this.defaultConfiguration;
    }
    restoreDefault(): boolean {
        return this.set(this.defaultConfiguration);
    }
}
