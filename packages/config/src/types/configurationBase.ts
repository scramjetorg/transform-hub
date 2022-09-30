/**
 * Base read only configuration
 */
interface ConfigurationBase {
    /**
   * Get configuration
   * @returns configuration, or null if unable to get 
   */
     get(): any | null;
     /**
      * Validate configuration
      * @param config configuration to validate
      */
     validate(config: any): boolean;
     /**
      * Check if configuration is valid
      * @returns true if configuration object is valid
      */
     isValid(): boolean;
}

export default ConfigurationBase;
