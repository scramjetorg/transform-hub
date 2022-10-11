import { ReadOnlyConfigFile } from "./readOnlyConfigFile";

/**
 * Configuration object held in file
 */
export abstract class ReadOnlyConfigFileDefault<Type extends Object> extends ReadOnlyConfigFile<Type> {
    protected readonly defaultConfiguration: Type;

    constructor(filePath: string, defaultConf: Type) {
        super(filePath);
        this.defaultConfiguration = defaultConf;
    }

    get(): Type {
        if (!this.isValid())
            return this.defaultConfiguration;
        return super.get();
    }
    getDefault(): Type {
        return this.defaultConfiguration;
    }
}
