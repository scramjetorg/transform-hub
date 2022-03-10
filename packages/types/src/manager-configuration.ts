/**
 * Manager configuration type definition.
 */
export type ManagerConfiguration = {
    /**
     * Enables/disables colorized logs.
     */
    logColors: boolean;

    /**
     * MultiManager api base.
     */
    apiBase: string;

    /**
     * MultiManager server hostname
     */
    hostname: string;

    /**
     * Allow to connect Host providing id but hasn't been registered in Manager.
     */
    allowUnknownHosts: boolean;

    /**
     * Manager id.
     */
    id: string;

    /**
     * Port for server listening for incoming Host connections.
     */
    sthServerPort: number;

    /**
     * Host controller configuration.
     */
    sthController: {

        /**
         * Number of milliseconds to wait for next LOAD message from `host` before marking it as unhealthy
         */
        unhealthyTimeoutMs: number;
    };
};
