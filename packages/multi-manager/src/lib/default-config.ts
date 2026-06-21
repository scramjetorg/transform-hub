import { homedir } from "os";
import { join } from "path";
import { ManagerVerser2Config } from "@scramjet/types";
import { MultiManagerCommandOptions, MultiManagerOptions } from "../types/multi-manager-types";

const defaultVerser2Config: ManagerVerser2Config = {
    enabled: true,
    host: {
        identityDir: join(homedir(), ".scramjet", "verser2-multimanager-host"),
        bindHost: "0.0.0.0",
        bindPort: 2443,
        publicUrl: "https://127.0.0.1:2443",
        tls: {
            mtlsRequired: false
        }
    },
    registration: {
        allowedClientFingerprints: []
    },
    localBroker: {
        peerId: "multimanager.default.broker",
        routeDomain: "multimanager.default.scramjet.internal"
    },
    localGuest: {
        peerId: "multimanager.default.guest",
        routeDomain: "multimanager.default.scramjet.internal"
    },
    timeouts: {
        routeReadinessMs: 10_000,
        leaseAcquireMs: 10_000,
        requestMs: 30_000
    },
    leases: {
        minimumWaitingLeases: 1
    }
};

/**
 * Default MultiManager configuration.
 */
export const defaultConfig: MultiManagerOptions = {
    /**
     * Log level.
     */
    logLevel: "TRACE",

    /**
     * Enable/disable colored log output.
     */
    logColors: true,

    /**
     * MultiManager id.
     */
    id: "",

    /**
     * MultiManager API server configuration.
     */
    server: {
        apiBase: "/api/v1",
        apiPort: 11000,
        apiHost: "0.0.0.0",
        version: ""
    },

    /**
     * Minimum requirements to start new Manager instance.
     */
    instanceRequirements: {
        /**
         * Free memory required to start Manager instance. In megabytes.
         */
        freeMem: 32,

        /**
         * Required free CPU to start Manager instance. In percentage.
         */
        cpuLoad: 10,

        /**
         * Free disk space required to start Manager instance. In megabytes.
         */
        freeSpace: 64,
    },

    /**
     * The amount of memory that must remain free.
     */
    safeOperationLimit: 64,

    fsPaths: [homedir()],

    verser2: defaultVerser2Config
};

/**
 * Creates settings merging command options with default config
 * @param options command line options
 * @returns multi manager options
 */
export function createSettings(options: MultiManagerCommandOptions): MultiManagerOptions {
    const s3 = {
        accessKey: process.env.S3_AKEY,
        secretKey: process.env.S3_SKEY,
        endPoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET,
        useSSL: process.env.S3_SSL !== "false"
    };

    const settings = {
        logLevel: options.logLevel || defaultConfig.logLevel,
        logColors: defaultConfig.logColors && options.colors,
        id: options.id || defaultConfig.id,
        server: {
            apiBase: options?.serverApiBase || defaultConfig.server.apiBase,
            apiPort: options?.serverApiPort || defaultConfig.server.apiPort,
            apiHost: options?.serverApiHost || defaultConfig.server.apiHost,
            version: options?.serverVersion || defaultConfig.server.version,
        },
        sslKeyPath: options.sslKeyPath,
        sslCertPath: options.sslCertPath,
        manager: options.manager,
        instanceRequirements: {
            freeMem: defaultConfig.instanceRequirements.freeMem,
            cpuLoad: defaultConfig.instanceRequirements.cpuLoad,
            freeSpace: defaultConfig.instanceRequirements.freeSpace,
        },
        safeOperationLimit: defaultConfig.safeOperationLimit,
        fsPaths: [],
        verser2: defaultVerser2Config
    };

    if (!Object.values(s3).find(v => v === undefined)) {
        Object.assign(settings, {
            s3: {
                ...s3,
                region: process.env.S3_REGION,
                port: process.env.S3_PORT && parseInt(process.env.S3_PORT, 10)
            }
        });
    }

    return settings;
}
