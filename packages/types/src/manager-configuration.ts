import { isIdPattern } from "./utils";

export type ManagerId = string

export const isManagerId = (id: string): id is ManagerId => isIdPattern(id);

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
    id: ManagerId;

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
