import { ApiVersion, DeepPartial, IdString, LoadCheckRequirements, LogLevel, ManagerConfiguration, Port, UrlPath } from "@scramjet/types";

export type MultiManagerServerOptions = {
    apiBase: UrlPath
    apiHost: string,
    apiPort: Port
    version: ApiVersion
};

export interface MultiManagerOptions extends LoadCheckRequirements {
    /**
     * Log level.
     */
    logLevel: LogLevel;
    /**
     * Enable/disable colored log output.
     */
    logColors: boolean;
    /**
     * MultiManager id.
     */
    id: IdString
    /**
     * MultiManager API server configuration.
     */
    server: MultiManagerServerOptions
    /**
     * Id of manager to start
     */
    manager?: string | ManagerConfiguration | ManagerConfiguration[],
    /**
     * S3 API key set and configs.
     */

    s3?: {
        endPoint: string;
        accessKey: string;
        secretKey: string;
        bucket: string;
        port: number;
        useSSL: boolean;
        region: string;
        bucketLimit: number
    },
    monitoringServer?: {
        port: number,
        host: string,
        path: string
    }
}

export type MultiManagerCommandOptions = {
    config?: string,
    logLevel: LogLevel
    colors: boolean
    id?: string
    dumpHeap: number,
    serverApiBase?: string
    serverApiPort?: number
    serverApiHost?: string
    serverVersion?: string
    sslKeyPath?: string
    sslCertPath?: string
    manager?: string;
    s3AccessKeyId: string,
    s3SecretAccessKey: string
    healtzPort?: number,
    healtzPath?: string,
    healtzHost?: string
}

export type StartManagerRequestParams = DeepPartial<ManagerConfiguration>;
