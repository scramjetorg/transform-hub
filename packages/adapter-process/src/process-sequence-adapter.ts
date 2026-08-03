import { ObjLogger } from "@scramjet/obj-logger";
import { IObjectLogger } from "@scramjet/runtime-types";
import { ISequenceAdapter, SequenceConfig } from "@scramjet/runtime-types";
import { STHConfiguration } from "@scramjet/api-types";
import { Readable } from "stream";
import fs from "fs/promises";
import path from "path";
import { isDefined } from "@scramjet/utility";
import { SequenceAdapterError } from "@scramjet/model";
import { getRunnerConfigForStoredSequence } from "@scramjet/adapters-common";
import { x } from "tar";

/**
 * Adapter for preparing Sequence to be run in process.
 */
class ProcessSequenceAdapter implements ISequenceAdapter {
    logger: IObjectLogger;

    name = "ProcessSequenceAdapter";

    constructor(private config: STHConfiguration) {
        this.logger = new ObjLogger(this);
    }

    /**
     * Initializes adapter.
     *
     * @returns {Promise<void>} Promise resolving after initialization.
     */
    async init(): Promise<void> {
        await fs.access(this.config.sequencesRoot)
            .catch(() => fs.mkdir(this.config.sequencesRoot));

        this.logger.info("Proces adapter initialized with options", {
            "sequence root": this.config.sequencesRoot
        });
    }

    /**
     * Finds existing sequences.
     *
     * @returns {Promise<SequenceConfig[]>} Promise resolving to array of identified sequences.
     */
    async list(): Promise<SequenceConfig[]> {
        const storedSequencesIds = await fs.readdir(this.config.sequencesRoot);
        const sequencesConfigs = (await Promise.all(
            storedSequencesIds
                .filter((id) => !id.startsWith("."))
                .map((id) => getRunnerConfigForStoredSequence("process", this.config.sequencesRoot, id))
                .map((configPromised) => configPromised.catch(() => null))
        ))
            .filter(isDefined);

        this.logger.debug(`Found ${sequencesConfigs.length} stored sequences`);

        return sequencesConfigs;
    }

    /**
     * Unpacks and identifies sequence.
     *
     * @param {Readable} stream Stream with packed sequence.
     * @param {string} id Sequence Id.
     * @param {boolean} override Removes previous sequence
     * @returns {Promise<SequenceConfig>} Promise resolving to identified sequence configuration.
     */
    async identify(stream: Readable, id: string, override = false): Promise<SequenceConfig> {
        const sequenceDir = path.join(this.config.sequencesRoot, id);

        if (override) {
            await fs.rm(sequenceDir, { recursive: true, force: true });
        }

        await fs.mkdir(sequenceDir, { recursive: true });

        const uncompress = stream.pipe(x({ C: sequenceDir }));

        try {
            await new Promise((res, rej) => {
                uncompress.on("end", res);
                uncompress.on("error", (err) => {
                    this.logger.error("Unpacking sequence failed", err);
                    rej(err);
                });
            });
        } catch (e) {
            this.logger.info("Unpacking sequence failed", e);
            await fs.rm(sequenceDir, { recursive: true, force: true });
            throw new SequenceAdapterError("PRERUNNER_ERROR", `Error unpacking sequence: ${e}`);
        }

        return getRunnerConfigForStoredSequence("process", this.config.sequencesRoot, id);
    }

    /**
     * Removes directory used to store sequence.
     *
     * @param {SequenceConfig} config Sequence configuration.
     * @returns {Promise<void>} Promise resolving after directory deletion.
     */
    async remove(config: SequenceConfig) {
        if (config.type !== "process") {
            throw new Error(`Incorrect SequenceConfig passed to ProcessSequenceAdapter: ${config.type}`);
        }

        const sequenceDir = path.join(this.config.sequencesRoot, config.id);

        return fs.rm(sequenceDir, { recursive: true });
    }
}

export { ProcessSequenceAdapter };
