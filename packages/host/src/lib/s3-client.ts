import { ObjLogger } from "@scramjet/obj-logger";
import { GetObjectCommand, S3Client as AwsS3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent, IncomingHttpHeaders, IncomingMessage } from "http";
import { Agent as HttpsAgent } from "https";
import { Readable } from "stream";

type SequenceStoreClientConfig = {
    host: string;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
};

export class S3Client {
    private readonly ownedAgent = new Agent({ keepAlive: true });
    private readonly ownedHttpsAgent = new HttpsAgent({ keepAlive: true });
    private disposed = false;
    agent = this.ownedAgent;
    requestHandler: NodeHttpHandler;
    client: AwsS3Client;
    clientConfig: SequenceStoreClientConfig;

    logger = new ObjLogger(this);

    constructor(config: Partial<SequenceStoreClientConfig>) {
        this.clientConfig = {
            host: config.host || "",
            region: config.region || "",
            bucket: config.bucket || "",
            ...config,
        };

        this.requestHandler = new NodeHttpHandler({ httpAgent: this.agent, httpsAgent: this.ownedHttpsAgent });
        this.client = this.createClient();
        this.logger.debug("S3 config", this.loggableConfig());
        this.logger.info("S3 client created", this.loggableConfig());
    }

    setAgent(agent: Agent) {
        this.assertNotDisposed();
        this.agent = agent;
        this.requestHandler.updateHttpClientConfig("httpAgent", agent);
    }

    async getObject(options: { filename: string; directory?: string }):
        Promise<{status: number, data: Readable, headers: IncomingHttpHeaders }> {
        this.assertNotDisposed();
        const response = await this.client.send(new GetObjectCommand({
            Bucket: this.clientConfig.bucket,
            Key: this.getObjectKey(options),
        }));
        const data = response.Body;

        if (!data || !(data instanceof Readable)) {
            throw new Error("S3 object response did not contain a readable stream");
        }

        const incomingMessage = data as IncomingMessage;
        return {
            status: response.$metadata.httpStatusCode || 200,
            data,
            headers: incomingMessage.headers,
        };
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.ownedAgent.destroy();
        this.ownedHttpsAgent.destroy();
    }

    private createClient() {
        const credentials = this.getStaticCredentials();
        const client = new AwsS3Client({
            endpoint: this.clientConfig.host,
            forcePathStyle: true,
            region: this.clientConfig.region || "us-east-1",
            ...(credentials ? { credentials } : {}),
            requestHandler: this.requestHandler,
        });

        if (!credentials) {
            client.middlewareStack.remove("httpAuthSchemeMiddleware");
            client.middlewareStack.remove("httpSigningMiddleware");
        }

        return client;
    }

    private getObjectKey({ filename, directory }: { filename: string; directory?: string }) {
        return [directory, filename]
            .filter((part): part is string => Boolean(part))
            .map(part => part.replace(/^\/+|\/+$/g, ""))
            .join("/");
    }

    private loggableConfig() {
        const { host, region, bucket } = this.clientConfig;
        return { host, region, bucket };
    }

    private getStaticCredentials() {
        const { accessKeyId, secretAccessKey, sessionToken } = this.clientConfig;
        const hasAccessKey = Boolean(accessKeyId);
        const hasSecretKey = Boolean(secretAccessKey);

        if (hasAccessKey !== hasSecretKey || (sessionToken && !hasAccessKey)) {
            throw new Error("S3 accessKeyId and secretAccessKey must be provided together");
        }

        if (!hasAccessKey || !accessKeyId || !secretAccessKey) return undefined;

        return { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
    }

    private assertNotDisposed() {
        if (this.disposed) throw new Error("S3 client has been disposed");
    }
}
