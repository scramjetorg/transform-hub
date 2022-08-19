import { ObjLogger } from "@scramjet/obj-logger";
import { Agent, IncomingHttpHeaders } from "http";
import { PicoS3, CLOUD_PROVIDERS, getObject } from "pico-s3";
import { Readable } from "stream";

type SequenceStoreClientConfig = {
    host: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    provider: CLOUD_PROVIDERS;
};

export class S3Client {
    agent = new Agent({ keepAlive: true });
    client: PicoS3;
    clientConfig: SequenceStoreClientConfig;

    logger = new ObjLogger(this);

    constructor(config: Partial<SequenceStoreClientConfig>) {
        this.clientConfig = {
            host: config.host || "",
            region: config.region || "",
            bucket: config.bucket || "",
            accessKeyId: config.accessKeyId || "",
            secretAccessKey: config.secretAccessKey || "",
            provider: CLOUD_PROVIDERS.MINIO,
            ...config,
        };

        this.client = new PicoS3(this.clientConfig);
        this.logger.debug("S3 config", this.clientConfig);
        this.logger.info("S3 client created", this.clientConfig);
    }

    setAgent(agent: Agent) {
        this.agent = agent;
    }

    async getObject(options: { filename: string; directory?: string }): Promise<{status: number, data: Readable, headers: IncomingHttpHeaders }> {
        return getObject(
            {
                ...this.clientConfig,
                ...options,
            },
            { httpAgent: this.agent, responseType: "stream" }
        );
    }
}
