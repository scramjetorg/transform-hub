import { ObjLogger } from "@scramjet/obj-logger";
import {
    ProcessSequenceConfig,
    ISequenceAdapter,
    STHConfiguration,
    SequenceConfig,
    IObjectLogger,
} from "@scramjet/types";
import { Readable } from "stream";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { sequencePackageJSONDecoder } from "./validate-sequence-package-json";

/**
 * Returns existing Sequence configuration.
 *
 * @param {string} sequencesRoot Folder where sequences are located.
 * @param {string} id Sequence Id.
 * @returns {ProcessSequenceConfig} Sequence configuration.
 */
async function getRunnerConfigForStoredSequence(sequencesRoot: string, id: string): Promise<ProcessSequenceConfig> {
    const sequenceDir = path.join(sequencesRoot, id);
    const packageJsonPath = path.join(sequenceDir, "package.json");
    const packageJson = await readStreamedJSON(createReadStream(packageJsonPath));

    const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(packageJson);
    const engines = validPackageJson.engines ? { ...validPackageJson.engines } : {};

    return {
        type: "process",
        engines,
        entrypointPath: validPackageJson.main,
        version: validPackageJson.version ?? "",
        name: validPackageJson.name ?? "",
        id,
        sequenceDir
    };
}

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
        return fs.access(this.config.sequencesRoot)
            .catch(() => fs.mkdir(this.config.sequencesRoot));
    }

    /**
     * Finds existing sequences.
     *
     * @returns {Promise<SequenceConfig[]>} Promise resolving to array of identified sequences.
     */
    async list(): Promise<SequenceConfig[]> {
        const storedSequencesIds = await fs.readdir(this.config.sequencesRoot);
        const sequencesConfigs = await Promise.all(
            storedSequencesIds
                .map((id) => getRunnerConfigForStoredSequence(this.config.sequencesRoot, id))
                .map((configPromised) => configPromised.catch(() => null))
        );

        this.logger.debug("Listed stored sequences", sequencesConfigs);

        return sequencesConfigs
            .filter(isDefined);
    }

    /**
     * Unpacks and identifies sequence.
     *
     * @param {Readable} stream Stream with packed sequence.
     * @param {string} id Sequence Id.
     * @returns {Promise<SequenceConfig>} Promise resolving to identified sequence configuration.
     */
    async identify(stream: Readable, id: string): Promise<SequenceConfig> {
        const sequenceDir = path.join(this.config.sequencesRoot, id);

        await fs.mkdir(sequenceDir);

        const uncompressingProc = exec(`tar zxf - -C ${sequenceDir}`);

        stream.pipe(uncompressingProc.stdin!);

        await new Promise(res => uncompressingProc.on("close", res));

        return getRunnerConfigForStoredSequence(this.config.sequencesRoot, id);
    }

    /**
     * Removes directory used to store sequence.
     *
     * @param {SequenceConfig} config Sequence configuration.
     * @returns {Promise<void>} Promise resolving after directory deletion.
     */
    async remove(config: SequenceConfig) {
        if (config.type !== "process") {
            throw new Error(`Incorrect SequenceConfig pased to ProcessSequenceAdapter: ${config.type}`);
        }

        const sequenceDir = path.join(this.config.sequencesRoot, config.id);

        return fs.rm(sequenceDir, { recursive: true });
    }
}

export { ProcessSequenceAdapter };
