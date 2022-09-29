import { ReadOnlyConfigBase } from "./readOnlyConfigBase";

/**
 * Read only configuration object
 */
export abstract class ReadOnlyConfig extends ReadOnlyConfigBase {
    protected readonly configuration: Object;
    protected readonly isValidConfig: boolean;

    constructor(configuration: Object) {
        super();
        if (this.validate(configuration)) {
            this.isValidConfig = true;
            this.configuration = configuration;
        } else {
            this.isValidConfig = false;
            this.configuration = {};
        }
    }

    /**
     * @returns Configuration object, or empty object if configuration is not valid.
     */
    get(): Object {
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

    /**
     * Check if key exist in configuration
     * @param key key to check if exists
     * @return true if key exists in configuration
     */
    has(key: keyof Object): boolean {
        return key in this.configuration;
    }
    /**
     * Get value of specified entry
     * @param key Entry key to get
     * @returns Value of entry or null if invalid configuration
     */
    getEntry(key: keyof Object): any | null {
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
