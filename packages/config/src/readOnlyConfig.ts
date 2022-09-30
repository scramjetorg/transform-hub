import ReadOnlyConfiguration from "./types/readOnlyConfiguration";

/**
 * Read only configuration object
 */
export abstract class ReadOnlyConfig<Type extends Object> implements ReadOnlyConfiguration<Type> {
    protected readonly configuration: Type;
    protected readonly isValidConfig: boolean;

    constructor(configuration: Type) {
        if (this.validate(configuration)) {
            this.isValidConfig = true;
            this.configuration = configuration;
        } else {
            this.isValidConfig = false;
            this.configuration = {} as Type;
        }
    }

    get(): Type {
        return this.configuration;
    }

    validate(config: Object): boolean {
        if (Object.keys(config).length === 0) return false;

        for (const key in config) {
            if (this.validateEntry(key, config[key as keyof Object]) === false) return false;
        }
        return true;
    }
    isValid() { return this.isValidConfig; }

    has(key: keyof Type): boolean {
        return key in this.configuration;
    }

    getEntry(key: keyof Type): any | null {
        if (!this.isValidConfig) return null;
        return this.configuration[key];
    }
    /**
     * Validate entry
     * @param key entry key
     * @param value entry value
     * @returns validation result or null if validation for key should be skipped
     */
    protected abstract validateEntry(key: string, value: any): boolean | null;
}
