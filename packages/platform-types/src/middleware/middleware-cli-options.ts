import { OrganisationStoreClientCliOptions } from "../organisation-store-client";

export type MiddlewareOptions = {
    logLevel?: string;
    orchestratorUrl?: string;
    secret?: string;
    idkfa?: boolean;
};

export type MiddlewareServerSslCliOptions = {
    sslKeyPath?: string;
    sslCertPath?: string;
};

export type MiddlewareServerCliOptions = {
    port?: number;
    host?: string;
    hybrid: boolean;
} & MiddlewareServerSslCliOptions;

export type MiddlewareAuthCliOptions = {
    iamJwksUrl: string;
};

export type MiddlewareMonitoringOptions = {
    healtzPort: number;
    healtzHost: string;
    healtzPath: string;
}

export type MiddlewareOrganisationStoreClientCliOptions = OrganisationStoreClientCliOptions;

export type MiddlewareCLIOptions = { config: string } & MiddlewareOptions &
    MiddlewareServerCliOptions &
    MiddlewareAuthCliOptions &
    MiddlewareOrganisationStoreClientCliOptions &
    MiddlewareMonitoringOptions;
