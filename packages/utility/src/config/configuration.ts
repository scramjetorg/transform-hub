import ReadOnlyConfiguration from "./readOnlyConfiguration";

/**
 * Modifiable configuration object
 */
interface Configuration<Type extends Object> extends ReadOnlyConfiguration<Type> {
    /**
     * Set configuration
     * @param config configuration to set
     * @returns true if config was valid and set
     */
    set(config: Record<string, any>): boolean
    /**
     * Set configuration entry
     * @param key key to set
     * @param value value to set
     * @returns false if new entry is invalid, true otherwise
     */
    setEntry(key: keyof Type, value: any): boolean
    /**
     * Remove entry from configuration.
     * Configuration must be valid after removing entry
     * @param key entry key to remove
     * @returns false if removing entry would invalidate configuration, true otherwise
     */
    deleteEntry(key: keyof Type): boolean
}

export default Configuration;
