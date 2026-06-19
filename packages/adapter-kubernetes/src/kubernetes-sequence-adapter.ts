import { ObjLogger } from "@scramjet/obj-logger";
import {
    ISequenceAdapter,
    STHConfiguration,
    SequenceConfig,
    IObjectLogger,
    K8SAdapterConfiguration,
} from "@scramjet/types";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import fs, { stat } from "fs/promises";
import path, { join } from "path";
import { isDefined } from "@scramjet/utility";
import { adapterConfigDecoder } from "./kubernetes-config-decoder";
import { SequenceAdapterError } from "@scramjet/model";
import { COMPRESSED_DIR } from "./constants";
import { x } from "tar";
import { getRunnerConfigForStoredSequence } from "@scramjet/adapters-common";

/**
 * Adapter for preparing Sequence to be run in process.
 */
class KubernetesSequenceAdapter implements ISequenceAdapter {
    logger: IObjectLogger;

    name = "KubernetesSequenceAdapter";

    private adapterConfig: K8SAdapterConfiguration;
    sequenceWorkdir: string;

    constructor(sthConfig: STHConfiguration) {
        const decodedAdapterConfig = adapterConfigDecoder.decode(sthConfig.adapters.kubernetes);

        if (!decodedAdapterConfig.isOk()) {
            throw new Error("Invalid Kubernetes Adapter configuration");
        }

        this.adapterConfig = decodedAdapterConfig.value;
        this.sequenceWorkdir = join(this.adapterConfig.sequencesRoot, COMPRESSED_DIR);
        this.logger = new ObjLogger(this);
    }

    /**
     * Initializes adapter.
     *
     * @returns {Promise<void>} Promise resolving after initialization.
     */
    async init(): Promise<void> {
        await fs.access(this.adapterConfig.sequencesRoot)
            .catch(() => fs.mkdir(this.adapterConfig.sequencesRoot));

        const sequenceWorkdir = await stat(this.sequenceWorkdir).catch(() => fs.mkdir(this.sequenceWorkdir));

        if (sequenceWorkdir && !sequenceWorkdir.isDirectory()) {
            throw new SequenceAdapterError("CONFIGURATION_ERROR", `Kubernetes sequence workdir exists and is not a directory: ${this.sequenceWorkdir}`);
        }

        this.logger.info("Kubernetes adapter initialized with options", {
            "runner images": this.adapterConfig.runnerImages,
            "sequences root": this.adapterConfig.sequencesRoot,
            timeout: this.adapterConfig.timeout
        });
    }

    /**
     * Finds existing sequences.
     *
     * @returns {Promise<SequenceConfig[]>} Promise resolving to array of identified sequences.
     */
    async list(): Promise<SequenceConfig[]> {
        const storedSequencesIds = await fs.readdir(this.adapterConfig.sequencesRoot);
        const sequencesConfigs = (await Promise.all(
            storedSequencesIds
                .filter((id) => !id.startsWith("."))
                .map((id) => getRunnerConfigForStoredSequence("kubernetes", this.adapterConfig.sequencesRoot, id))
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
        // 1. Unpack package.json to stdout and map to config
        // 2. Create compressed package on the disk
        const sequenceDir = path.join(this.adapterConfig.sequencesRoot, id);

        if (override) {
            await fs.rm(sequenceDir, { recursive: true, force: true });
        }

        await fs.mkdir(sequenceDir);

        const compressedOut = createWriteStream(path.join(this.sequenceWorkdir, `${id}.tar.gz`));

        // @TODO unpack only package.json
        const uncompressingInput = x({ gzip: true, cwd: sequenceDir });

        stream.pipe(uncompressingInput);
        stream.pipe(compressedOut);

        await new Promise(res => {
            uncompressingInput.on("error", (err) => {
                this.logger.error("Error unpacking sequence", err);
                compressedOut.close();
                throw new SequenceAdapterError("PRERUNNER_ERROR", `Error unpacking sequence: ${err.message}`);
            });
            uncompressingInput.on("close", res);
        });

        return getRunnerConfigForStoredSequence("kubernetes", this.adapterConfig.sequencesRoot, id);
    }

    /**
     * Removes directory used to store sequence.
     *
     * @param {SequenceConfig} config Sequence configuration.
     * @returns {Promise<void>} Promise resolving after directory deletion.
     */
    async remove(config: SequenceConfig) {
        if (config.type !== "kubernetes") {
            throw new Error(`Incorrect SequenceConfig passed to KubernetesSequenceAdapter: ${config.type}`);
        }

        const sequenceDir = path.join(this.adapterConfig.sequencesRoot, config.id);

        this.logger.debug("Removing sequence directory...", sequenceDir);

        return fs.rm(sequenceDir, { recursive: true });
    }
}

export { KubernetesSequenceAdapter };
