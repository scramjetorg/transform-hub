export type Verser2MigrationMode = "legacy" | "dual" | "verser2";

export type Verser2TlsFilesConfig = {
    certFile?: string;
    keyFile?: string;
    pfxFile?: string;
    passphrase?: string;
};

export type Verser2HostTlsConfig = Verser2TlsFilesConfig & {
    clientAuthCaFile?: string;
    mtlsRequired: boolean;
};

export type Verser2ClientTlsConfig = Verser2TlsFilesConfig & {
    ca?: string;
    caFile?: string;
};

export type STHRunnerVerser2HostConfig = {
    enabled: boolean;
    host: {
        bindHost: string;
        bindPort: number;
        publicUrl: string;
        tls: Verser2HostTlsConfig;
    };
    registration: {
        allowLocalPeers: boolean;
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
};

export type ManagerVerser2Config = {
    enabled: boolean;
    migrationMode: Verser2MigrationMode;
    host: {
        bindHost: string;
        bindPort: number;
        publicUrl: string;
        tls: Verser2HostTlsConfig;
    };
    registration: {
        allowLocalPeers: boolean;
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
    timeouts: Verser2TimeoutConfig;
    leases: Verser2LeaseConfig;
};

export type STHOutboundVerser2Config = {
    enabled: boolean;
    migrationMode: Verser2MigrationMode;
    hostUrl: string;
    runnerHost?: STHRunnerVerser2HostConfig;
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
