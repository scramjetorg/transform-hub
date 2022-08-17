import { ObjLogger } from "@scramjet/obj-logger";
import {
    ISequenceAdapter,
    STHConfiguration,
    SequenceConfig,
    IObjectLogger,
    KubernetesSequenceConfig,
    K8SAdapterConfiguration,
} from "@scramjet/types";
import { Readable } from "stream";
import { createReadStream, createWriteStream } from "fs";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { sequencePackageJSONDecoder } from "./validate-sequence-package-json";
import { adapterConfigDecoder } from "./kubernetes-config-decoder";

/**
 * Returns existing Sequence configuration.
 *
 * @param {string} sequencesRoot Folder where sequences are located.
 * @param {string} id Sequence Id.
 * @returns {ProcessSequenceConfig} Sequence configuration.
 */
async function getRunnerConfigForStoredSequence(sequencesRoot: string, id: string): Promise<KubernetesSequenceConfig> {
    const sequenceDir = path.join(sequencesRoot, id);
    const packageJsonPath = path.join(sequenceDir, "package.json");
    const packageJson = await readStreamedJSON(createReadStream(packageJsonPath));

    const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(packageJson);
    const engines = validPackageJson.engines ? { ...validPackageJson.engines } : {};

    return {
        type: "kubernetes",
        entrypointPath: validPackageJson.main,
        version: validPackageJson.version ?? "",
        name: validPackageJson.name ?? "",
        id,
        sequenceDir,
        engines,
        description: validPackageJson.description || "",
        author: validPackageJson.author || "",
        keywords: validPackageJson.keywords || [],
    };
}

/**
 * Adapter for preparing Sequence to be run in process.
 */
class KubernetesSequenceAdapter implements ISequenceAdapter {
    logger: IObjectLogger;

    name = "KubernetesSequenceAdapter";

    private adapterConfig: K8SAdapterConfiguration

    constructor(sthConfig: STHConfiguration) {
        const decodedAdapterConfig = adapterConfigDecoder.decode(sthConfig.kubernetes);

        if (!decodedAdapterConfig.isOk()) {
            throw new Error("Invalid Kubernetes Adapter configuration");
        }

        this.adapterConfig = decodedAdapterConfig.value;
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
                .map((id) => getRunnerConfigForStoredSequence(this.adapterConfig.sequencesRoot, id))
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
     * @returns {Promise<SequenceConfig>} Promise resolving to identified sequence configuration.
     */
    async identify(stream: Readable, id: string): Promise<SequenceConfig> {
        // 1. Unpack package.json to stdout and map to config
        // 2. Create compressed package on the disk
        const sequenceDir = path.join(this.adapterConfig.sequencesRoot, id);

        await fs.mkdir(sequenceDir);

        const compressedOut = createWriteStream(path.join(sequenceDir, "compressed.tar.gz"));

        // @TODO unpack only package.json
        const uncompressingProc = exec(`tar zxf - -C ${sequenceDir}`);

        stream.pipe(uncompressingProc.stdin!);
        stream.pipe(compressedOut);

        await new Promise(res => uncompressingProc.on("close", res));

        return getRunnerConfigForStoredSequence(this.adapterConfig.sequencesRoot, id);
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
