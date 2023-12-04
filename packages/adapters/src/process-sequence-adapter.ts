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
import { IDProvider, SequenceAdapterError } from "@scramjet/model";
import { detectLanguage } from "./utils";

/**
 * Returns existing Sequence configuration.
 *
 * @param {string} sequencesRoot Folder where sequences are located.
 * @param {string} id Sequence Id.
 * @returns {ProcessSequenceConfig} Sequence configuration.
 */
// eslint-disable-next-line complexity, max-len
async function getRunnerConfigForStoredSequence(sequencesRoot: string, id: string, parentId?: string): Promise<ProcessSequenceConfig> {
    let sequenceDir: string;

    if (parentId) {
        sequenceDir = path.join(sequencesRoot, id + "_" + parentId);
    } else {
        [id, parentId] = id.split("_");
        const valid = IDProvider.isValid(id);

        if (valid) {
            sequenceDir = path.join(sequencesRoot, id + "_" + parentId);
        } else {
            sequenceDir = path.join(sequencesRoot, id);
        }
    }

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
        parent_id: parentId || id,
        sequenceDir,
        description: validPackageJson.description,
        author: validPackageJson.author,
        keywords: validPackageJson.keywords,
        args: validPackageJson.args,
        repository: validPackageJson.repository,
        language: detectLanguage(validPackageJson)
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
                .map((id) => getRunnerConfigForStoredSequence(this.config.sequencesRoot, id))
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
     * @param {string} parentId Sequence's parentId.

     * @returns {Promise<SequenceConfig>} Promise resolving to identified sequence configuration.
     */
    async identify(stream: Readable, id: string, override = false, parentId = id): Promise<SequenceConfig> {
        const sequenceDir = path.join(this.config.sequencesRoot, id + "_" + parentId);

        if (override) {
            await fs.rm(sequenceDir, { recursive: true, force: true });
        }

        await fs.mkdir(sequenceDir, { recursive: true });

        const uncompressingProc = exec(`tar zxf - -C ${sequenceDir} >/dev/null 2>&1 || echo >&2 '{"error":"Invalid pkg tar.gz archive"}' && exit 1`);

        stream.pipe(uncompressingProc.stdin!);

        const stderrChunks: string[] = [];

        uncompressingProc.stderr!.on("data", (chunk: Buffer) => {
            stderrChunks.push(chunk.toString());
        });

        await new Promise(res => uncompressingProc.on("close", res));

        const stderrOutput = stderrChunks.join("");

        if (stderrOutput) {
            let preRunnenrError;

            try {
                preRunnenrError = JSON.parse(stderrOutput);
                this.logger.error("Unpacking sequence failed", stderrOutput);
            } catch (e) {
                throw new SequenceAdapterError("PRERUNNER_ERROR", `Error parsing ${stderrOutput}`);
            }

            throw new SequenceAdapterError("PRERUNNER_ERROR", preRunnenrError.error);
        }

        this.logger.debug("Unpacking sequence succeeded", stderrOutput);

        return getRunnerConfigForStoredSequence(this.config.sequencesRoot, id, parentId);
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

        const sequenceDir = config.sequenceDir;

        return fs.rm(sequenceDir, { recursive: true });
    }
}

export { ProcessSequenceAdapter };
