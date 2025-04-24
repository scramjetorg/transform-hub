import { KubernetesSequenceConfig, ProcessSequenceConfig } from "@scramjet/types";
import { readStreamedJSON } from "@scramjet/utility";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join } from "path";
import { sequencePackageJSONDecoder } from "./validate-sequence-package-json";

/**
 * Determines Sequence language by checking file extension in `main` field.
 * When failed, checks `engines` field for `node`.
 * Returns "unknown" when language can't be determined with this methods.
 *
 * @param {any} packageJson package.json contents
 * @returns {string} Detected language or "unknown"
 */
export const detectLanguage = (packageJson: {[key: string]: any}) => {
    if (packageJson.engines) {
        if ("python3" in packageJson.engines) return "py";
        if ("node" in packageJson.engines) return "js";
    }

    return (packageJson.main?.match(/(?:\.)([^.\\/:*?"<>|\r\n]+$)/) || { 1: undefined })[1] || "unknown";
};

type Adapters = "process" | "kubernetes" | "docker";

type SequenceConfig<T extends Adapters> = 
    T extends "process" ? ProcessSequenceConfig :
    T extends "kubernetes" ? KubernetesSequenceConfig :
    // T extends "docker" ? DockerSequenceConfig :
    // TODO: Add DockerSequenceConfig when implemented
    never;

/**
 * Returns existing Sequence configuration.
 *
 * @param {string} sequencesRoot Folder where sequences are located.
 * @param {string} id Sequence Id.
 * @returns {SequenceConfig} Sequence configuration.
 */
// eslint-disable-next-line complexity
export async function getRunnerConfigForStoredSequence<T extends Adapters>(adapter: T, sequencesRoot: string, id: string): Promise<SequenceConfig<T>> {
    const sequenceDir = join(sequencesRoot, id);

    if (!(await stat(sequenceDir)).isDirectory()) {
        throw new Error(`Not a directory: ${sequenceDir}`);
    }

    const packageJsonPath = join(sequenceDir, "package.json");
    const packageJson = await readStreamedJSON(createReadStream(packageJsonPath));

    const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(packageJson);
    const engines = validPackageJson.engines ? { ...validPackageJson.engines } : {};

    return {
        type: adapter,
        engines,
        entrypointPath: validPackageJson.main,
        version: validPackageJson.version ?? "",
        name: validPackageJson.name ?? "",
        id,
        sequenceDir,
        description: validPackageJson.description,
        author: validPackageJson.author,
        keywords: validPackageJson.keywords,
        args: validPackageJson.args,
        repository: validPackageJson.repository,
        exposePath: validPackageJson.exposePath,
        exposeHost: validPackageJson.exposeHost,
        tags: validPackageJson.tags,
        language: detectLanguage(validPackageJson)
    } as SequenceConfig<T>;
}
