import { ApiVersion, DeepPartial, IdString, LoadCheckRequirements, LogLevel, ManagerConfiguration, ManagerVerser2Config, Port, UrlPath } from "@scramjet/types";

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
    },
    verser2: ManagerVerser2Config
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
    verser2Enabled?: boolean;
    verser2HostBindHost?: string;
    verser2HostBindPort?: number;
    verser2HostPublicUrl?: string;
    verser2HostCertFile?: string;
    verser2HostKeyFile?: string;
    verser2HostPfxFile?: string;
    verser2HostPassphrase?: string;
    verser2HostClientAuthCaFile?: string;
    verser2MtlsRequired?: boolean;
    verser2RegistrationToken?: string;
    verser2AllowLocalPeers?: boolean;
    verser2AllowedClientFingerprints?: string[];
    verser2LocalBrokerPeerId?: string;
    verser2LocalBrokerRouteDomain?: string;
    verser2LocalGuestPeerId?: string;
    verser2LocalGuestRouteDomain?: string;
    verser2RouteReadinessMs?: number;
    verser2LeaseAcquireMs?: number;
    verser2RequestMs?: number;
    verser2MinimumWaitingLeases?: number;
}

export type StartManagerRequestParams = DeepPartial<ManagerConfiguration>;
