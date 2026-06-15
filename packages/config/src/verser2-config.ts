import type { ConfigOptionDescriptor } from ".";
import { z } from "zod";

export const verser2MigrationModeSchema = z.enum(["legacy", "dual", "verser2"]);

const optionalFileSchema = z.string().min(1).optional();
const timeoutsSchema = z.object({
    routeReadinessMs: z.number().int().nonnegative(),
    leaseAcquireMs: z.number().int().nonnegative(),
    requestMs: z.number().int().nonnegative()
}).strict();
const leasesSchema = z.object({
    minimumWaitingLeases: z.number().int().nonnegative()
}).strict();

export const managerVerser2ConfigSchema = z.object({
    enabled: z.boolean(),
    migrationMode: verser2MigrationModeSchema,
    host: z.object({
        bindHost: z.string(),
        bindPort: z.number().int().nonnegative(),
        publicUrl: z.string(),
        tls: z.object({
            certFile: optionalFileSchema,
            keyFile: optionalFileSchema,
            pfxFile: optionalFileSchema,
            passphrase: optionalFileSchema,
            clientAuthCaFile: optionalFileSchema,
            mtlsRequired: z.boolean()
        }).strict()
    }).strict(),
    registration: z.object({
        allowLocalPeers: z.boolean(),
        token: optionalFileSchema,
        allowedClientFingerprints: z.array(z.string())
    }).strict(),
    localBroker: z.object({ peerId: z.string(), routeDomain: z.string() }).strict(),
    localGuest: z.object({ peerId: z.string(), routeDomain: z.string() }).strict(),
    timeouts: timeoutsSchema,
    leases: leasesSchema
}).strict();

export const sthOutboundVerser2ConfigSchema = z.object({
    enabled: z.boolean(),
    migrationMode: verser2MigrationModeSchema,
    hostUrl: z.string(),
    runnerHost: z.object({
        enabled: z.boolean(),
        host: z.object({
            bindHost: z.string(),
            bindPort: z.number().int().nonnegative(),
            publicUrl: z.string(),
            tls: z.object({
                certFile: optionalFileSchema,
                keyFile: optionalFileSchema,
                pfxFile: optionalFileSchema,
                passphrase: optionalFileSchema,
                clientAuthCaFile: optionalFileSchema,
                mtlsRequired: z.boolean()
            }).strict()
        }).strict(),
        registration: z.object({
            allowLocalPeers: z.boolean(),
            token: optionalFileSchema,
            allowedClientFingerprints: z.array(z.string())
        }).strict(),
        localBroker: z.object({ peerId: z.string() }).strict()
    }).strict().optional(),
    broker: z.object({ peerId: z.string(), targetDomain: z.string() }).strict(),
    guest: z.object({ peerId: z.string(), routeDomain: z.string() }).strict(),
    tls: z.object({
        ca: optionalFileSchema,
        caFile: optionalFileSchema,
        certFile: optionalFileSchema,
        keyFile: optionalFileSchema,
        pfxFile: optionalFileSchema,
        passphrase: optionalFileSchema
    }).strict(),
    enrollment: z.object({ token: optionalFileSchema }).strict(),
    timeouts: timeoutsSchema,
    leases: leasesSchema
}).strict().superRefine((config, ctx) => {
    if (config.tls.certFile && !config.tls.keyFile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["tls", "keyFile"],
            message: "keyFile is required when certFile is provided"
        });
    }

    if (config.tls.keyFile && !config.tls.certFile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["tls", "certFile"],
            message: "certFile is required when keyFile is provided"
        });
    }

    const runnerTls = config.runnerHost?.host.tls;

    if (runnerTls?.certFile && !runnerTls.keyFile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["runnerHost", "host", "tls", "keyFile"],
            message: "keyFile is required when certFile is provided"
        });
    }

    if (runnerTls?.keyFile && !runnerTls.certFile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["runnerHost", "host", "tls", "certFile"],
            message: "certFile is required when keyFile is provided"
        });
    }

    if (config.runnerHost?.enabled && !runnerTls?.certFile && !runnerTls?.pfxFile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["runnerHost", "host", "tls"],
            message: "runnerHost TLS requires certFile/keyFile or pfxFile when enabled"
        });
    }

    if (config.runnerHost?.enabled && runnerTls?.mtlsRequired && !runnerTls.clientAuthCaFile) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["runnerHost", "host", "tls", "clientAuthCaFile"],
            message: "runnerHost mTLS requires clientAuthCaFile"
        });
    }

    if (!(config.enabled && config.migrationMode === "verser2")) return;

    ([
        ["hostUrl", config.hostUrl],
        ["broker.peerId", config.broker.peerId],
        ["broker.targetDomain", config.broker.targetDomain],
        ["guest.peerId", config.guest.peerId],
        ["guest.routeDomain", config.guest.routeDomain]
    ] as const).forEach(([path, value]) => {
        if (value.trim().length) return;

        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: path.split("."),
            message: `${path} is required when verser2 mode is enabled`
        });
    });
});

const managerPath = (path: string) => `verser2.${path}`;
const sthPath = (path: string) => `verser2.${path}`;

export const managerVerser2Options: ConfigOptionDescriptor[] = [
    { name: "verser2Enabled", flag: "verser2-enabled", path: managerPath("enabled"), env: "SCRAMJET_VERSER2_ENABLED", type: "boolean", description: "Enable verser2 Manager/STH transport" },
    { name: "verser2MigrationMode", flag: "verser2-migration-mode", path: managerPath("migrationMode"), env: "SCRAMJET_VERSER2_MIGRATION_MODE", type: "string", choices: ["legacy", "dual", "verser2"], description: "Manager/STH migration mode" },
    { name: "verser2HostBindHost", flag: "verser2-host-bind-host", path: managerPath("host.bindHost"), env: "SCRAMJET_VERSER2_HOST_BIND_HOST", type: "string", description: "verser2 Host bind address" },
    { name: "verser2HostBindPort", flag: "verser2-host-bind-port", path: managerPath("host.bindPort"), env: "SCRAMJET_VERSER2_HOST_BIND_PORT", type: "number", description: "verser2 Host bind port" },
    { name: "verser2HostPublicUrl", flag: "verser2-host-public-url", path: managerPath("host.publicUrl"), env: "SCRAMJET_VERSER2_HOST_PUBLIC_URL", type: "string", description: "Public TLS URL for verser2 peers" },
    { name: "verser2HostCertFile", flag: "verser2-host-cert-file", path: managerPath("host.tls.certFile"), env: "SCRAMJET_VERSER2_HOST_CERT_FILE", type: "string", description: "verser2 Host TLS certificate file" },
    { name: "verser2HostKeyFile", flag: "verser2-host-key-file", path: managerPath("host.tls.keyFile"), env: "SCRAMJET_VERSER2_HOST_KEY_FILE", type: "string", description: "verser2 Host TLS private key file", secret: true },
    { name: "verser2HostPfxFile", flag: "verser2-host-pfx-file", path: managerPath("host.tls.pfxFile"), env: "SCRAMJET_VERSER2_HOST_PFX_FILE", type: "string", description: "verser2 Host PFX/PKCS12 file", secret: true },
    { name: "verser2HostPassphrase", flag: "verser2-host-passphrase", path: managerPath("host.tls.passphrase"), env: "SCRAMJET_VERSER2_HOST_PASSPHRASE", type: "string", description: "verser2 Host TLS passphrase", secret: true },
    { name: "verser2HostClientAuthCaFile", flag: "verser2-host-client-auth-ca-file", path: managerPath("host.tls.clientAuthCaFile"), env: "SCRAMJET_VERSER2_HOST_CLIENT_AUTH_CA_FILE", type: "string", description: "CA file used to authenticate verser2 clients" },
    { name: "verser2MtlsRequired", flag: "verser2-mtls-required", path: managerPath("host.tls.mtlsRequired"), env: "SCRAMJET_VERSER2_MTLS_REQUIRED", type: "boolean", description: "Require client certificates for verser2 registration" },
    { name: "verser2RegistrationToken", flag: "verser2-registration-token", path: managerPath("registration.token"), env: "SCRAMJET_VERSER2_REGISTRATION_TOKEN", type: "string", description: "Non-mTLS verser2 registration token", secret: true },
    { name: "verser2AllowLocalPeers", flag: "verser2-allow-local-peers", path: managerPath("registration.allowLocalPeers"), env: "SCRAMJET_VERSER2_ALLOW_LOCAL_PEERS", type: "boolean", description: "Allow in-process local verser2 peers" },
    { name: "verser2AllowedClientFingerprints", flag: "verser2-allowed-client-fingerprints", path: managerPath("registration.allowedClientFingerprints"), env: "SCRAMJET_VERSER2_ALLOWED_CLIENT_FINGERPRINTS", type: "string[]", description: "Allowed verser2 client certificate fingerprints" },
    { name: "verser2LocalBrokerPeerId", flag: "verser2-local-broker-peer-id", path: managerPath("localBroker.peerId"), env: "SCRAMJET_VERSER2_LOCAL_BROKER_PEER_ID", type: "string", description: "Local Manager Broker peer ID" },
    { name: "verser2LocalBrokerRouteDomain", flag: "verser2-local-broker-route-domain", path: managerPath("localBroker.routeDomain"), env: "SCRAMJET_VERSER2_LOCAL_BROKER_ROUTE_DOMAIN", type: "string", description: "Local Manager Broker route domain" },
    { name: "verser2LocalGuestPeerId", flag: "verser2-local-guest-peer-id", path: managerPath("localGuest.peerId"), env: "SCRAMJET_VERSER2_LOCAL_GUEST_PEER_ID", type: "string", description: "Local Manager Guest peer ID" },
    { name: "verser2LocalGuestRouteDomain", flag: "verser2-local-guest-route-domain", path: managerPath("localGuest.routeDomain"), env: "SCRAMJET_VERSER2_LOCAL_GUEST_ROUTE_DOMAIN", type: "string", description: "Local Manager Guest route domain" },
    { name: "verser2RouteReadinessMs", flag: "verser2-route-readiness-ms", path: managerPath("timeouts.routeReadinessMs"), env: "SCRAMJET_VERSER2_ROUTE_READINESS_MS", type: "number", description: "Route readiness timeout in milliseconds" },
    { name: "verser2LeaseAcquireMs", flag: "verser2-lease-acquire-ms", path: managerPath("timeouts.leaseAcquireMs"), env: "SCRAMJET_VERSER2_LEASE_ACQUIRE_MS", type: "number", description: "Lease acquisition timeout in milliseconds" },
    { name: "verser2RequestMs", flag: "verser2-request-ms", path: managerPath("timeouts.requestMs"), env: "SCRAMJET_VERSER2_REQUEST_MS", type: "number", description: "Routed request timeout in milliseconds" },
    { name: "verser2MinimumWaitingLeases", flag: "verser2-minimum-waiting-leases", path: managerPath("leases.minimumWaitingLeases"), env: "SCRAMJET_VERSER2_MINIMUM_WAITING_LEASES", type: "number", description: "Minimum waiting leases per route" }
];

export const sthOutboundVerser2Options: ConfigOptionDescriptor[] = [
    { name: "verser2Enabled", flag: "verser2-enabled", path: sthPath("enabled"), env: "SCRAMJET_VERSER2_ENABLED", type: "boolean", description: "Enable outbound STH verser2 transport" },
    { name: "verser2MigrationMode", flag: "verser2-migration-mode", path: sthPath("migrationMode"), env: "SCRAMJET_VERSER2_MIGRATION_MODE", type: "string", choices: ["legacy", "dual", "verser2"], description: "STH Manager transport migration mode" },
    { name: "verser2HostUrl", flag: "verser2-host-url", path: sthPath("hostUrl"), env: "SCRAMJET_VERSER2_HOST_URL", flagAliases: ["cpm-verser2-url"], type: "string", description: "Manager/MultiManager verser2 Host URL" },
    { name: "verser2RunnerHostEnabled", flag: "verser2-runner-host-enabled", path: sthPath("runnerHost.enabled"), env: "SCRAMJET_VERSER2_RUNNER_HOST_ENABLED", type: "boolean", description: "Enable the STH-local verser2 Host for runners" },
    { name: "verser2RunnerHostBindHost", flag: "verser2-runner-host-bind-host", path: sthPath("runnerHost.host.bindHost"), env: "SCRAMJET_VERSER2_RUNNER_HOST_BIND_HOST", type: "string", description: "STH-local runner verser2 Host bind address" },
    { name: "verser2RunnerHostBindPort", flag: "verser2-runner-host-bind-port", path: sthPath("runnerHost.host.bindPort"), env: "SCRAMJET_VERSER2_RUNNER_HOST_BIND_PORT", type: "number", description: "STH-local runner verser2 Host bind port" },
    { name: "verser2RunnerHostPublicUrl", flag: "verser2-runner-host-public-url", path: sthPath("runnerHost.host.publicUrl"), env: "SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL", type: "string", description: "STH-local runner verser2 Host URL passed to runners" },
    { name: "verser2RunnerHostCertFile", flag: "verser2-runner-host-cert-file", path: sthPath("runnerHost.host.tls.certFile"), env: "SCRAMJET_VERSER2_RUNNER_HOST_CERT_FILE", type: "string", description: "STH-local runner Host TLS certificate file" },
    { name: "verser2RunnerHostKeyFile", flag: "verser2-runner-host-key-file", path: sthPath("runnerHost.host.tls.keyFile"), env: "SCRAMJET_VERSER2_RUNNER_HOST_KEY_FILE", type: "string", description: "STH-local runner Host TLS private key file", secret: true },
    { name: "verser2RunnerHostPfxFile", flag: "verser2-runner-host-pfx-file", path: sthPath("runnerHost.host.tls.pfxFile"), env: "SCRAMJET_VERSER2_RUNNER_HOST_PFX_FILE", type: "string", description: "STH-local runner Host PFX/PKCS12 file", secret: true },
    { name: "verser2RunnerHostPassphrase", flag: "verser2-runner-host-passphrase", path: sthPath("runnerHost.host.tls.passphrase"), env: "SCRAMJET_VERSER2_RUNNER_HOST_PASSPHRASE", type: "string", description: "STH-local runner Host TLS passphrase", secret: true },
    { name: "verser2RunnerHostClientAuthCaFile", flag: "verser2-runner-host-client-auth-ca-file", path: sthPath("runnerHost.host.tls.clientAuthCaFile"), env: "SCRAMJET_VERSER2_RUNNER_HOST_CLIENT_AUTH_CA_FILE", type: "string", description: "CA file used to authenticate runner verser2 clients" },
    { name: "verser2RunnerHostMtlsRequired", flag: "verser2-runner-host-mtls-required", path: sthPath("runnerHost.host.tls.mtlsRequired"), env: "SCRAMJET_VERSER2_RUNNER_HOST_MTLS_REQUIRED", type: "boolean", description: "Require runner client certificates for STH-local verser2 registration" },
    { name: "verser2RunnerHostRegistrationToken", flag: "verser2-runner-host-registration-token", path: sthPath("runnerHost.registration.token"), env: "SCRAMJET_VERSER2_RUNNER_HOST_REGISTRATION_TOKEN", type: "string", description: "Non-mTLS runner registration token", secret: true },
    { name: "verser2RunnerHostAllowLocalPeers", flag: "verser2-runner-host-allow-local-peers", path: sthPath("runnerHost.registration.allowLocalPeers"), env: "SCRAMJET_VERSER2_RUNNER_HOST_ALLOW_LOCAL_PEERS", type: "boolean", description: "Allow in-process local peers on the STH-local runner Host" },
    { name: "verser2RunnerHostAllowedClientFingerprints", flag: "verser2-runner-host-allowed-client-fingerprints", path: sthPath("runnerHost.registration.allowedClientFingerprints"), env: "SCRAMJET_VERSER2_RUNNER_HOST_ALLOWED_CLIENT_FINGERPRINTS", type: "string[]", description: "Allowed runner client certificate fingerprints" },
    { name: "verser2RunnerHostBrokerPeerId", flag: "verser2-runner-host-broker-peer-id", path: sthPath("runnerHost.localBroker.peerId"), env: "SCRAMJET_VERSER2_RUNNER_HOST_BROKER_PEER_ID", type: "string", description: "Local STH Broker peer ID for runner routes" },
    { name: "verser2Ca", flag: "verser2-ca", path: sthPath("tls.ca"), env: "SCRAMJET_VERSER2_CA", type: "string", description: "Inline CA PEM bundle for the Manager/MultiManager verser2 Host" },
    { name: "verser2CaFile", flag: "verser2-ca-file", path: sthPath("tls.caFile"), env: "SCRAMJET_VERSER2_CA_FILE", envAliases: ["CPM_SSL_CA_PATH"], type: "string", description: "CA file for the Manager/MultiManager verser2 Host" },
    { name: "verser2CertFile", flag: "verser2-cert-file", path: sthPath("tls.certFile"), env: "SCRAMJET_VERSER2_CERT_FILE", type: "string", description: "STH client certificate file" },
    { name: "verser2KeyFile", flag: "verser2-key-file", path: sthPath("tls.keyFile"), env: "SCRAMJET_VERSER2_KEY_FILE", type: "string", description: "STH client private key file", secret: true },
    { name: "verser2PfxFile", flag: "verser2-pfx-file", path: sthPath("tls.pfxFile"), env: "SCRAMJET_VERSER2_PFX_FILE", type: "string", description: "STH client PFX/PKCS12 file", secret: true },
    { name: "verser2Passphrase", flag: "verser2-passphrase", path: sthPath("tls.passphrase"), env: "SCRAMJET_VERSER2_PASSPHRASE", type: "string", description: "STH client TLS passphrase", secret: true },
    { name: "verser2EnrollmentToken", flag: "verser2-enrollment-token", path: sthPath("enrollment.token"), env: "SCRAMJET_VERSER2_ENROLLMENT_TOKEN", type: "string", description: "STH verser2 enrollment token", secret: true },
    { name: "verser2BrokerPeerId", flag: "verser2-broker-peer-id", path: sthPath("broker.peerId"), env: "SCRAMJET_VERSER2_BROKER_PEER_ID", type: "string", description: "STH Broker peer ID" },
    { name: "verser2BrokerTargetDomain", flag: "verser2-broker-target-domain", path: sthPath("broker.targetDomain"), env: "SCRAMJET_VERSER2_BROKER_TARGET_DOMAIN", type: "string", description: "Target Manager/MultiManager route domain" },
    { name: "verser2GuestPeerId", flag: "verser2-guest-peer-id", path: sthPath("guest.peerId"), env: "SCRAMJET_VERSER2_GUEST_PEER_ID", type: "string", description: "STH Guest peer ID" },
    { name: "verser2GuestRouteDomain", flag: "verser2-guest-route-domain", path: sthPath("guest.routeDomain"), env: "SCRAMJET_VERSER2_GUEST_ROUTE_DOMAIN", type: "string", description: "STH Guest route domain" },
    { name: "verser2RouteReadinessMs", flag: "verser2-route-readiness-ms", path: sthPath("timeouts.routeReadinessMs"), env: "SCRAMJET_VERSER2_ROUTE_READINESS_MS", type: "number", description: "Route readiness timeout in milliseconds" },
    { name: "verser2LeaseAcquireMs", flag: "verser2-lease-acquire-ms", path: sthPath("timeouts.leaseAcquireMs"), env: "SCRAMJET_VERSER2_LEASE_ACQUIRE_MS", type: "number", description: "Lease acquisition timeout in milliseconds" },
    { name: "verser2RequestMs", flag: "verser2-request-ms", path: sthPath("timeouts.requestMs"), env: "SCRAMJET_VERSER2_REQUEST_MS", type: "number", description: "Routed request timeout in milliseconds" },
    { name: "verser2MinimumWaitingLeases", flag: "verser2-minimum-waiting-leases", path: sthPath("leases.minimumWaitingLeases"), env: "SCRAMJET_VERSER2_MINIMUM_WAITING_LEASES", type: "number", description: "Minimum waiting leases per route" }
];
