import { ReadOnlyConfig } from "./readOnlyConfig";

/**
 * Modifiable configuration object
 */
export abstract class Config extends ReadOnlyConfig {
    protected configuration!: Object;
    protected isValidConfig!: boolean;
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
    setEntry(key: keyof Object, value: any): boolean {
        if (!this.validateEntry(key, value)) return false;
        this.configuration[key] = value;
        return true;
    }
    /**
     * Remove entry from configuration.
     * Configuration must be valid after removing entry
     * @param key entry key to remove
     * @returns false if removing entry would invalidate configuration, true otherwise
     */
    deleteEntry(key: keyof Object): boolean {
        if (!this.validateEntry(key, undefined)) return false;
        delete this.configuration[key];
        return true;
    }
}

