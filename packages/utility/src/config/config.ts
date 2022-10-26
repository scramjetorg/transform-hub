import Configuration from "./configuration";

/**
 * Modifiable configuration object
 */
export abstract class Config<Type extends Object> implements Configuration<Type> {
    protected configuration: Type;
    protected isValidConfig: boolean;

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

    validate(config: Record<string, any>): boolean {
        if (Object.keys(config).length === 0) return false;

        for (const key in config) {
            if (this.validateEntry(key, config[key]) === false) return false;
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
    /**
     * Set configuration
     * @param config configuration to set
     * @returns true if config was valid and set
     */
    set(config: any): boolean {
        if (!this.validate(config)) return false;
        this.isValidConfig = true;
        this.configuration = config;
        return true;
    }
    /**
     * Set configuration entry
     * @param key key to set
     * @param value value to set
     * @returns false if new entry is invalid, true otherwise
     */
    setEntry(key: keyof Type, value: any): boolean {
        if (this.validateEntry(key as string, value) === false) return false;
        this.configuration[key as keyof Object] = value;
        return true;
    }
    /**
     * Remove entry from configuration.
     * Configuration must be valid after removing entry
     * @param key entry key to remove
     * @returns false if removing entry would invalidate configuration, true otherwise
     */
    deleteEntry(key: keyof Type): boolean {
        if (this.validateEntry(key as string, undefined) === false) return false;
        delete this.configuration[key];
        return true;
    }
}

