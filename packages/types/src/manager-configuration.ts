import { IdString } from "./utils";
import { ManagerVerser2Config } from "./verser2-transport-configuration";

/**
 * Manager configuration type definition.
 */
export type ManagerConfiguration = {
    /**
     * Enables/disables colorized logs.
     */
    logColors: boolean;

    /**
     * Log level for the manager.
     */
    logLevel: "debug" | "info" | "warn" | "error" | "fatal";

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
    };

    verser2: ManagerVerser2Config;
};
