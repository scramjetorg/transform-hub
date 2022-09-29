/**
 * Base read only configuration
 */
export abstract class ReadOnlyConfigBase {
    /**
     * Get configuration
     * @returns configuration, or null if unable to get 
     */
    abstract get(): any | null;
    /**
     * Validate configuration
     * @param config configuration to validate
     */
    abstract validate(config: any): boolean;
    /**
     * Check if configuration is valid
     * @returns true if configuration object is valid
     */
    abstract isValid(): boolean;
}
