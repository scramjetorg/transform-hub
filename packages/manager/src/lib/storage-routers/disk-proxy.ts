import { getRouter } from "@scramjet/api-server";
import { IDProvider } from "@scramjet/model";
import { ObjLogger } from "@scramjet/obj-logger";
import { ISequenceAdapter, ParsedMessage, STHConfiguration } from "@scramjet/types";
import { ReasonPhrases } from "http-status-codes";
import { DataStream } from "scramjet";
import { augment } from "@scramjet/adapter-process";
import { ServerResponse } from "http";
import { Readable } from "stream";
import { defer, promiseTimeout } from "@scramjet/utility";
import { readFile, stat, unlink, writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { createReadStream, createWriteStream } from "fs";

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
    bucketLimit: number
}

class DiskClient {
    async exists(path: string, location: string) {
        try {
            await stat(resolve(path, location));
            return true;
        } catch (error) {
            return false;
        }
    }

    async statObject(path: string, location: string) {
        try {
            const stats = await stat(resolve(path, location));

            return {
                size: stats.size,
                modified: stats.mtime
            };
        } catch (error) {
            throw Object.assign(new Error(`File not found: ${resolve(path, location)}`), {
                code: "NotFound",
            });
        }
    }

    async getText(path: string, location: string) {
        await this.statObject(path, location);

        return readFile(resolve(path, location), "utf8");
    }

    async getObject(path: string, location: string) {
        await this.statObject(path, location);

        return createReadStream(resolve(path, location));
    }

    async putObject(path: string, location: string, data: Buffer | Readable, _size?: number, _metadata?: any) {
        const directory = dirname(location);

        try {
            await this.statObject(path, directory);
        } catch (error) {
            // create directory
            await mkdir(resolve(path, directory), { recursive: true });
        }

        if (data instanceof Buffer) {
            await writeFile(resolve(path, location), data);
        } else {
            await new Promise<void>((res, rej) => {
                const writeStream = createWriteStream(resolve(path, location));

                (data as Readable).pipe(writeStream);

                writeStream.on("finish", res);
                writeStream.on("error", rej);
            });
        }

        if (_metadata) {
            await writeFile(resolve(path, `${location}.metadata`), JSON.stringify(_metadata));
        }
    }

    async removeObject(path: string, location: string) {
        if (await this.exists(path, `${location}.metadata`)) {
            await unlink(resolve(path, `${location}.metadata`));
        }

        await this.statObject(path, location);

        return unlink(resolve(path, location));
    }
}

export class DiskProxy {
    router = getRouter();
    logger: ObjLogger;
    index: SequenceIndex = { sequences: [], size: 0, version: "1.0" };

    private bucket: string;
    private id: string;
    private base: string;
    private s3Client: DiskClient;
    private bucketLimit: number;

    async loadIndex(): Promise<void> {
        this.logger.info("Looking for s3 index on filesystem", this.bucket);
        try {
            await new Promise<void>((resolveIndexCheck, rejectIndexCheck) => {
                this.s3Client.statObject(this.bucket, `${this.id}/index.json`)
                    .then(() => resolveIndexCheck())
                    .catch((error: any) => {
                        this.logger.info(`S3 index ${error.code}, bucket: ${this.bucket}, folder: ${this.id}`);

                        if (error.code === "NotFound" || error.code === "NoSuchKey") {
                            this.saveIndex().then(() => resolveIndexCheck()).catch((e) => rejectIndexCheck(e));
                        } else {
                            this.logger.info("S3 index", error);
                            rejectIndexCheck();
                        }
                    });
            });

            this.logger.info("Loading s3 index...");

            const indexFile = await this.s3Client.getText(this.bucket, `${this.id}/index.json`);

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
            throw error;
        }
    }

    async saveIndex(): Promise<any> {
        let success = false;

        this.index.size = this.index.sequences.reduce((p, c) => {
            return p + (c.packageSize || 0);
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

    constructor(config: S3ProxyParams) {
        this.id = config.id;
        this.bucket = config.bucket;
        this.base = config.base;
        this.bucketLimit = config.bucketLimit;
        this.s3Client = new DiskClient();

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

            return this.s3Client.putObject(this.bucket, `${this.id}/${filename}`, packageStream.rewind(), 0, { id: seqConfig.id })
                .then(async () => {
                    try {
                        await this.addSequenceToIndex({ ...seqConfig, _filename: filename, _fileId: fileId });
                    } catch (err: any) {
                        this.logger.error("Index update failed", err.message);
                    }

                    return {
                        opStatus: ReasonPhrases.ACCEPTED,
                        etag: "0",
                        versionId: "0"
                    };
                }, async (error: any) => {
                    throw Object.assign(
                        new Error(),
                        { opStatus: ReasonPhrases.FAILED_DEPENDENCY, msg: { error: error.code } }
                    );
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
