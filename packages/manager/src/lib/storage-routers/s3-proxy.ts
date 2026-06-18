import { getRouter } from "@scramjet/api-server";
import { IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { APIRoute, ISequenceAdapter, ParsedMessage, STHConfiguration } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { Client as MinioClient, UploadedObjectInfo } from "minio";
import { DataStream, StringStream } from "scramjet";
import { augment } from "@scramjet/adapter-process";
import { ServerResponse } from "http";
import { defer, promiseTimeout } from "@scramjet/utility";

type SequenceInfo = Awaited<ReturnType<ISequenceAdapter["identify"]>> & {
    _filename: string;
    _fileId: string;
};

type SequenceIndex = {
    sequences: SequenceInfo[];
    size: number;
    version: string;
}

type S3ProxyParams = {
    base: string,
    id: string,
    bucket: string,
    bucketLimit: number,
    router?: APIRoute
}

export class S3Proxy {
    router: APIRoute;
    logger: ObjLogger;
    index: SequenceIndex = { sequences: [], size: 0, version: "1.0" };

    private bucket: string;
    private id: string;
    private base: string;
    private bucketLimit: number;

    async loadIndex(): Promise<void> {
        this.logger.info("Looking for s3 index in bucket", this.bucket);
        try {
            await new Promise<void>((resolveStat, rejectStat) => {
                this.s3Client.statObject(this.bucket, `${this.id}/index.json`)
                    .then(() => resolveStat())
                    .catch((error: any) => {
                        this.logger.info(`S3 index ${error.code}, bucket: ${this.bucket}, folder: ${this.id}`);

                        if (error.code === "NotFound" || error.code === "NoSuchKey") {
                            this.saveIndex().then(() => resolveStat()).catch((e) => rejectStat(e));
                        } else {
                            this.logger.info("S3 index", error);
                            rejectStat();
                        }
                    });
            });

            this.logger.info("Loading s3 index...");

            const getObj = this.s3Client.getObject(this.bucket, `${this.id}/index.json`);
            const indexFile = await StringStream.from(
                await getObj
            )
                .catch((error: any) => {
                    this.logger.error(error.message);
                })
                .reduce((acc: any[], chunk: any) => {
                    acc = acc.concat(chunk);
                    return acc;
                }, []).then(result => result.join(""));

            this.index = JSON.parse(indexFile);

            // support previous version (index: SequenceInfo[]) convert to "1.0"
            if (Array.isArray(this.index)) {
                const sequences = this.index.filter(entry => entry.id !== undefined);

                this.index = { sequences, size: 0, version: "1.0" };

                await this.saveIndex();

                this.logger.info("Sequence index updated");
            }

            this.logger.info(`Sequence index loaded. Total ${this.index.sequences.length} sequences stored. Size: ${this.index.size / 1024}kb`);
        } catch (error) {
            this.logger.error("Index s3 download failed", error);
        }
    }

    async saveIndex(): Promise<any> {
        let success = false;

        this.index.size = this.index.sequences.reduce((p, c) => {
            return p || 0 + (c.packageSize || 0);
        }, 0);

        do {
            this.logger.info(`Saving sequences index in ${this.bucket}, folder: ${this.id}...`);

            try {
                await promiseTimeout(
                    this.s3Client.putObject(this.bucket, `${this.id}/index.json`, Buffer.from(JSON.stringify(this.index))),
                    5000
                );

                this.logger.info(`Sequences index in bucket ${this.bucket}, folder: ${this.id} updated`);
                success = true;
            } catch (error: any) {
                this.logger.error(`Sequences index in bucket ${this.bucket}, folder: ${this.id} update failed`, error && error.code);

                if (error && error.code === "NoSuchBucket") {
                    this.logger.warn(`Bucket ${this.bucket} not exists. Waiting then retrying...`);
                    break;
                }

                await defer(5000);
            }
        } while (!success);
    }

    async addSequenceToIndex(sequence: SequenceInfo): Promise<void> {
        this.index.sequences.push(sequence);
        await this.saveIndex();
    }

    async clearIndex() : Promise<void> {
        this.index.sequences = await this.index.sequences.reduce(async (acc: Promise<SequenceInfo[]>, item) => {
            const results = await acc;

            try {
                await this.s3Client.removeObject(this.bucket, `${this.id}/${item.id}`);
            } catch (_error) {
                results.push(item);
            }
            return results;
        }, Promise.resolve([]));

        await this.saveIndex();
    }

    constructor(private s3Client: MinioClient, config: S3ProxyParams) {
        this.id = config.id;
        this.bucket = config.bucket;
        this.base = config.base;
        this.bucketLimit = config.bucketLimit;
        this.router = config.router || getRouter();

        this.logger = new ObjLogger(this, { id: this.id });
        this.logger.info("args", arguments);

        const { SequenceAdapterClass: ProcessSequenceAdapter } = augment();

        const processSequenceAdapter = new ProcessSequenceAdapter({
            sequencesRoot: `/tmp/manager/${this.id}`
        } as STHConfiguration);

        processSequenceAdapter.logger.pipe(this.logger);

        // Log router's requests.
        this.router.use(`${this.base}`, (req, _res, next) => {
            this.logger.debug("request", req.method, req.url);

            return next();
        });

        // Return stored object
        this.router.upstream(`${this.base}/:directory/:filename?`, async (request: ParsedMessage, _response: ServerResponse) => {
            const params = request.params || {};

            params.filename ||= params.directory;

            this.logger.info("Retrieving object from external S3", request.params);

            return await this.s3Client.getObject(this.bucket, `${this.id}/${params.filename}`);
        });

        // Delete stored object
        this.router.op("delete", `${this.base}/:filename`, async (request) => {
            const { filename } = request.params || {};

            await this.s3Client.removeObject(this.bucket, `${this.id}/${filename}`);

            const originalLength = this.index.sequences.length;

            this.index.sequences = this.index.sequences.filter(seq => {
                return seq._filename !== filename && seq._fileId !== filename;
            });

            if (originalLength !== this.index.sequences.length) {
                await this.saveIndex();

                return { id: filename, opStatus: ReasonPhrases.ACCEPTED };
            }

            return { opStatus: ReasonPhrases.NOT_FOUND };
        });

        // Indentify and put object to storage.
        this.router.downstream(`${this.base}/:filename?`, async (request) => {
            const reqFilename = (request.params || {}).filename || "";
            const packageStream = DataStream.from(request).keep(-1);
            const fileId = IDProvider.generate();
            const filename = reqFilename || `${fileId}.tar.gz`;

            const seqConfig = { ...await processSequenceAdapter.identify(packageStream.rewind(), fileId, true) };

            const size = request.socket.bytesRead;

            if (seqConfig && (!seqConfig.name || !seqConfig.entrypointPath || !seqConfig.id)) {
                return {
                    opStatus: ReasonPhrases.UNPROCESSABLE_ENTITY
                };
            }

            this.logger.info("Incoming sequence identified", seqConfig);

            await processSequenceAdapter.remove(seqConfig);

            seqConfig.sequenceDir = ""; // misleading info
            seqConfig.packageSize = size;

            if (JSON.stringify(this.index).length + this.index.size + seqConfig.packageSize > this.bucketLimit) {
                return {
                    opStatus: ReasonPhrases.INSUFFICIENT_STORAGE
                };
            }

            return await new Promise<{ opStatus: ReasonPhrases, msg?: any }>((resolve, reject) => {
                this.s3Client.putObject(this.bucket, `${this.id}/${filename}`, packageStream.rewind(), 0, { id: seqConfig.id }, async (error: any, res: UploadedObjectInfo) => {
                    const msg = JSON.stringify(error ? { error: error.code } : res);

                    this.logger.info("Ext S3 response", error || res);

                    if (error) {
                        reject({ opStatus: ReasonPhrases.FAILED_DEPENDENCY, msg });
                    }

                    try {
                        await this.addSequenceToIndex({ ...seqConfig, _filename: filename, _fileId: fileId });
                    } catch (err: any) {
                        this.logger.error("Index update failed", err.message);
                    }

                    resolve({ opStatus: ReasonPhrases.ACCEPTED, ...res });
                });
            }).then(
                (r) => ({
                    ...r,
                    ...seqConfig,
                    sequenceDir: undefined,
                    type: undefined
                }),
                r => r
            );
        }, { method: "put" });

        this.router.get(`${this.base}`, () => this.index.sequences);
    }
}
