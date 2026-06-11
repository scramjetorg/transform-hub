import { ReadOnlyConfig, JsonFile, isLogLevel, merge } from "@scramjet/utility";
import { LoadCheckRequirements } from "@scramjet/types";
import { MultiManagerCommandOptions, MultiManagerOptions } from "../types/multi-manager-types";
import { MultiManagerServerConfig } from "./multi-manager-server-configuration";
import { LoadCheckConfig } from "@scramjet/load-check";
import { homedir } from "os";

const DEFAULT_BUCKET_SPACE_QUOTA = 5 * 1024 * 1024 * 1024;
const defaultMultiManagerConfig: MultiManagerOptions = {
    logLevel: "TRACE",
    logColors: true,
    id: "",
    server: {
        apiBase: "/api",
        apiPort: 11000,
        apiHost: "0.0.0.0",
        version: "v1"
    },
    instanceRequirements: {
        freeMem: 32,
        cpuLoad: 10,
        freeSpace: 64,
    },
    fsPaths: [homedir()],
    safeOperationLimit: 64,
    s3: {
        endPoint: "",
        accessKey: "",
        secretKey: "",
        bucket: "",
        port: 9000,
        useSSL: false,
        region: "",
        bucketLimit: DEFAULT_BUCKET_SPACE_QUOTA
    }
};

const getFileConfig = (filePath: string | undefined) => {
    let fileConfig = {};
    const configFile: JsonFile = new JsonFile(filePath || "");

    if (configFile.exists() && configFile.isReadable())
        fileConfig = configFile.read();

    return fileConfig;
};

// eslint-disable-next-line complexity
const mergeConfigs = (
    defaultConfig: MultiManagerOptions,
    options: MultiManagerCommandOptions,
    fileConfiguration: Record<string, any>
): MultiManagerOptions => {
    return {
        logLevel: options.logLevel || fileConfiguration?.logLevel || defaultConfig.logLevel,
        logColors: (typeof fileConfiguration?.logColors === "boolean" ? fileConfiguration?.logColors : defaultConfig.logColors) && options.colors!,
        id: options.id || fileConfiguration?.id || defaultConfig.id,
        server: {
            apiBase: options?.serverApiBase || fileConfiguration?.server?.apiBase || defaultConfig.server.apiBase,
            apiPort: options?.serverApiPort || fileConfiguration?.server?.apiPort || defaultConfig.server.apiPort,
            apiHost: options?.serverApiHost || fileConfiguration?.server?.apiHost || defaultConfig.server.apiHost,
            version: options?.serverVersion || fileConfiguration?.server?.version || defaultConfig.server.version,
        },
        manager: options.manager || fileConfiguration?.manager,
        instanceRequirements: {
            freeMem: fileConfiguration?.instanceRequirements?.freeMem || defaultConfig.instanceRequirements.freeMem,
            cpuLoad: fileConfiguration?.instanceRequirements?.cpuLoad || defaultConfig.instanceRequirements.cpuLoad,
            freeSpace: fileConfiguration?.instanceRequirements?.freeSpace ||
                defaultConfig.instanceRequirements.freeSpace,
        },
        safeOperationLimit: fileConfiguration?.safeOperationLimit || defaultConfig.safeOperationLimit,
        s3: {
            endPoint: fileConfiguration?.s3?.endPoint || defaultConfig.s3?.endPoint,
            accessKey: fileConfiguration?.s3?.accessKey || defaultConfig.s3?.accessKey,
            secretKey: fileConfiguration?.s3?.secretKey || defaultConfig.s3?.secretKey,
            bucket: fileConfiguration?.s3?.bucket || defaultConfig.s3?.bucket,
            port: fileConfiguration?.s3?.port || defaultConfig.s3?.port,
            useSSL: fileConfiguration?.s3?.useSSL || defaultConfig.s3?.useSSL,
            region: fileConfiguration?.s3?.region || defaultConfig.s3?.region,
            bucketLimit: fileConfiguration?.s3?.bucketLimit || defaultConfig.s3?.bucketLimit
        },
        monitoringServer: {
            host: fileConfiguration?.monitoringServer?.host || options?.healtzHost,
            path: fileConfiguration?.monitoringServer?.path || options?.healtzPath,
            port: fileConfiguration?.monitoringServer?.port || options?.healtzPort
        },
        fsPaths: defaultConfig.fsPaths
    };
};

export class MultiManagerConfig extends ReadOnlyConfig<MultiManagerOptions> {
    constructor(options: MultiManagerCommandOptions) {
        const fileConfig = getFileConfig(options.config);

        if (typeof fileConfig !== "object")
            throw new Error("Invalid file configuration");

        const multiManagerConfig = mergeConfigs(defaultMultiManagerConfig, options, fileConfig);

        super(multiManagerConfig);
    }

    get logLevel() { return this.configuration.logLevel; }
    get logColors() { return this.configuration.logColors; }
    get id() { return this.configuration.id; }
    get server() { return this.configuration.server; }
    get manager() { return this.configuration.manager; }
    get loadCheckRequirements(): LoadCheckRequirements {
        const { safeOperationLimit, instanceRequirements, fsPaths } = this.configuration;

        return { safeOperationLimit, instanceRequirements, fsPaths };
    }
    get s3() { return this.configuration.s3; }
    get monitoringServer() { return this.configuration.monitoringServer; }

    _maskValue(value: string, regex: RegExp = /(?<=.{2}).+/, mask = "X") {
        return value.replace(regex, mask.padEnd(value.length - 2, "X"));
    }

    getMasked(): MultiManagerOptions {
        const config = { s3: {} } as Partial<MultiManagerOptions>;

        merge(config, this.configuration);

        if (config.s3) {
            config.s3.accessKey = this._maskValue(config.s3.accessKey);
            config.s3.secretKey = this._maskValue(config.s3.secretKey);
            config.s3.bucket = this._maskValue(config.s3.bucket);
            config.s3.endPoint = this._maskValue(config.s3.endPoint);
            config.s3.region = this._maskValue(config.s3.region);
        }

        return config as MultiManagerOptions;
    }

    protected validateEntry(key: string, value: any): boolean | null {
        return MultiManagerConfig.validateEntry(key, value);
    }

    static validateEntry(key: string, value: any): boolean | null {
        switch (key) {
            case "logLevel":
                return isLogLevel(value);
            case "logColors":
                return typeof value === "boolean";
            case "id":
                return null;
            case "server":
                return new MultiManagerServerConfig(value).isValid();
            case "manager":
                if (value === undefined) return null;
                return true;
            case "safeOperationLimit":
            case "instanceRequirements":
                return LoadCheckConfig.validateEntry(key, value);
            default:
                return null;
        }
    }
}
