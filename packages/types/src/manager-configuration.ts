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
     * Manager id.
     */
    id: string;

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
