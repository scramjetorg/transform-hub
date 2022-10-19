import ConfigurationBase from "./configurationBase";

/**
 * Read only configuration object
 */
interface ReadOnlyConfiguration<Type extends Object> extends ConfigurationBase {
    /**
     * @returns Configuration object, or empty object if configuration is not valid.
     */
    get(): Type;
    validate(config: Record<string, any>): boolean ;
    isValid(): boolean;

    /**
     * Check if key exist in configuration
     * @param key key to check if exists
     * @return true if key exists in configuration
     */
    has(key: keyof Type): boolean ;
    /**
     * Get value of specified entry
     * @param key Entry key to get
     * @returns Value of entry or null if invalid configuration
     */
    getEntry(key: keyof Type): any | null;
}

export default ReadOnlyConfiguration;
