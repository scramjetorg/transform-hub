import { OrganisationStoreClientCliOptions, OrganisationStoreType } from "../organisation-store-client";
import { PaymentsSystem } from "../payments-client";

export type OrchestratorServerSslCliOptions = {
    sslKeyPath?: string;
    sslCertPath?: string;
};

export type OrchestratorServerCliOptions = {
    port?: number;
    host?: string;
} & OrchestratorServerSslCliOptions;

export type OrchestratorKeycloakCliOptions= {
    iamDriver: "keycloak";
    iamBaseUrl?: string;
    iamRealm?: string;
    iamGrantType?: string;
    iamUserRealm?: string;
    iamUsername?: string;
    iamPassword?: string;
    iamClientId?: string;
    iamClientSecret?: string;
    iamWebhookSecret?: string;
    iamTotp?: string;
    iamOfflineToken?: boolean;
    iamRefreshToken?: string;
    iamScopes?: string[];
}

export type OrchestratorAuth0CliOptions= {
    iamDriver: "auth0";
    iamDomain?: string;
    iamAudience?: string;
    iamClientId?: string;
    iamSecret?: string;
    iamWebhookSecret?: string;
};

export type OrchestratorAuthCliOptions = {
    iamDriver: "auth0" | "keycloak";
} & (OrchestratorKeycloakCliOptions | OrchestratorAuth0CliOptions);

export type OrchestratorPaymentsCliOptions = {
    paymentsApiKey?: string;
    paymentsSystem?: PaymentsSystem;
    paymentsWebhookSecret?: string;
    paymentPortalConfigurationId?: string;
};

export type CouchStoreAdapter = {
    organisationStoreAdapter: OrganisationStoreType.CouchDB;
    couchdb: {
        protocol: string;
        user: string;
        password: string;
        host: string;
        port: string;
    };
};

export type InmemoryStoreAdapter = {
    organisationStoreAdapter: OrganisationStoreType.InMemory;
    inmemory: {};
};

export type OrchestratorOrganisationStoreClientCliOptions = OrganisationStoreClientCliOptions;

export type OrchestratorOrganisationClusterCliOptions = {
    mhServiceName?: string;
    mmServiceName?: string;
    clusterDomain?: string;
};

export type OrchestratorOrganisationDbCliOptions = {
    s3Driver?: string;
    awsProfile?: string;
    s3Region?: string;
    s3Endpoint?: string;
    iamRegion?: string;
    iamEndpoint?: string;
};

export type OrchestratorSecretStoreCliOptions = {
    vaultDriver?: string;
    vaultEndpoint?: string;
    vaultRoleId?: string;
    valueSecretId?: string;
    vaultPath?: string;
};

export type OrchestratorProvisionCliOptions = {
    provisionDriver?: string;
    provisionEndpoint?: string;
    provisionUser?: string;
    provisionPassword?: string;
};

export type MonitoringServerCliOptions = {
    healtzPort: number,
    healtzHost?: string,
    healtzPath?: string
}

export type OrchestratorCLIOptions = { config: string } & OrchestratorServerCliOptions &
    OrchestratorAuthCliOptions &
    OrchestratorPaymentsCliOptions &
    OrchestratorOrganisationStoreClientCliOptions &
    OrchestratorOrganisationClusterCliOptions &
    OrchestratorOrganisationDbCliOptions &
    OrchestratorSecretStoreCliOptions &
    OrchestratorProvisionCliOptions &
    MonitoringServerCliOptions;
