import { IdString } from "./utils";

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
    id: IdString;

    /**
     * Host controller configuration.
     */
    sthController: {

        /**
         * Number of milliseconds to wait for next LOAD message from `host` before marking it as unhealthy
         */
        unhealthyTimeoutMs: number;
    };

    s3?: {
        endPoint: string;
        accessKey: string;
        secretKey: string;
        bucket: string;
        useSSL: boolean,
        region: string
        port: number,
        bucketLimit: number
    }
};
