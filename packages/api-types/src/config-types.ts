/**
 * Configuration types for API-facing contracts.
 *
 * Full structural stubs migrated from @scramjet/types.
 * Simplified for the split — non-critical fields use loose types.
 */

// ---------------------------------------------------------------------------
// Adapter configuration types
// ---------------------------------------------------------------------------

export type AdapterConfig = {
    name: string;
    [key: string]: any;
};

export type ContainerConfiguration = {
    image: string;
    maxMem: number;
};

export type ContainerConfigurationWithExposedPorts = {
    hostIp: string;
    exposePortsRange: [number, number];
};

export type PreRunnerContainerConfiguration = ContainerConfiguration;
export type RunnerContainerConfiguration = ContainerConfiguration & ContainerConfigurationWithExposedPorts;

export type DockerAdapterConfiguration = {
    prerunner: PreRunnerContainerConfiguration;
    runner: RunnerContainerConfiguration;
    runnerImages: {
        python3: string;
        node: string;
        bun: string;
    };
};

export type K8SAdapterConfiguration = {
    namespace: string;
    quotaName?: string;
    defaultPullPolicy?: "IfNotPresent" | "Always" | "Never";
    authConfigPath?: string;
    sthPodHost: string;
    runnerImages: { python3: string; node: string; bun: string };
    sequencesRoot: string;
    timeout?: number;
    runnerResourcesRequestsMemory?: string;
    runnerResourcesRequestsCpu?: string;
    runnerResourcesLimitsMemory?: string;
    runnerResourcesLimitsCpu?: string;
};

export interface CouchDbAdapterConf {
    url: string;
    dbName?: string;
    user?: string;
    pass?: string;
}

// ---------------------------------------------------------------------------
// Host configuration
// ---------------------------------------------------------------------------

export type HostConfig = {
    hostname: string;
    id?: string;
    port: number;
    apiBase: string;
    instancesServerPort: number;
    infoFilePath: string;
    federationControl: boolean;
};

// ---------------------------------------------------------------------------
// Verser2 transport configuration types
// ---------------------------------------------------------------------------

export type Verser2TlsFilesConfig = {
    certFile?: string;
    keyFile?: string;
    pfxFile?: string;
    passphrase?: string;
};

export type Verser2HostTlsConfig = Verser2TlsFilesConfig & {
    caFile?: string;
    clientAuthCaFile?: string;
    mtlsRequired: boolean;
};

export type Verser2ClientTlsConfig = Verser2TlsFilesConfig & {
    ca?: string;
    caFile?: string;
};

/**
 * STH-local runner Host configuration. Defaults use port 2445; explicitly
 * configured 2444 endpoints remain supported for existing deployments.
 */
export type STHRunnerVerser2HostConfig = {
    enabled: boolean;
    identityDir: string;
    ca?: string;
    caFile?: string;
    host: {
        bindHost: string;
        bindPort: number;
        publicUrl: string;
        tls: Verser2HostTlsConfig;
    };
    registration: {
        token?: string;
        allowedClientFingerprints: string[];
    };
    localBroker: {
        peerId: string;
    };
};

export type Verser2TimeoutConfig = {
    routeReadinessMs: number;
    leaseAcquireMs: number;
    requestMs: number;
};

export type Verser2LeaseConfig = {
    minimumWaitingLeases: number;
    minimumRunnerWaitingStreams?: number;
    minimumUpstreamWaitingStreams?: number;
};

export type ManagerVerser2Config = {
    enabled: boolean;
    host: {
        identityDir?: string;
        bindHost: string;
        bindPort: number;
        publicUrl: string;
        tls: Verser2HostTlsConfig;
    };
    registration: {
        token?: string;
        allowedClientFingerprints: string[];
    };
    localBroker: {
        peerId: string;
        routeDomain: string;
    };
    localGuest: {
        peerId: string;
        routeDomain: string;
    };
    /** A separate, mTLS-only Verser2 surface for control-plane v2 HTTP (default port 2444). */
    controlIngress?: {
        enabled: boolean;
        host: {
            identityDir?: string;
            bindHost: string;
            bindPort: number;
            publicUrl: string;
            tls: Verser2HostTlsConfig;
        };
        guest: {
            peerId: string;
            routeDomain: string;
        };
    };
    timeouts: Verser2TimeoutConfig;
    leases: Verser2LeaseConfig;
};

export type STHOutboundVerser2Config = {
    enabled: boolean;
    hostUrl: string;
    runnerHost?: STHRunnerVerser2HostConfig;
    controlIngress?: STHRunnerVerser2HostConfig & {
        guest: { peerId: string; routeDomain: string };
    };
    broker: {
        peerId: string;
        targetDomain: string;
    };
    guest: {
        peerId: string;
        routeDomain: string;
    };
    tls: Verser2ClientTlsConfig;
    enrollment: {
        token?: string;
    };
    timeouts: Verser2TimeoutConfig;
    leases: Verser2LeaseConfig;
};

// ---------------------------------------------------------------------------
// STH configuration
// ---------------------------------------------------------------------------

export type STHCommandOptions = Record<string, any>;

export type STHConfiguration = Record<string, any> & { verser2: any };

export type PublicSTHConfiguration = Record<string, any>;

export type DisconnectReason = "key_revoked" | "limit_exceeded" | "id_drop" | "disconnected";

// ---------------------------------------------------------------------------
// Manager configuration
// ---------------------------------------------------------------------------

export type ManagerConfiguration = Record<string, any> & { verser2: any };
