import { getLogger } from "@scramjet/logger";
import {
    Logger,
    ProcessSequenceConfig,
    ISequenceAdapter,
    STHConfiguration,
    SequenceConfig,
} from "@scramjet/types";
import { Readable } from "stream";
import { createReadStream } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { sequencePackageJSONDecoder } from "./validate-sequence-package-json";

async function getRunnerConfigForStoredSequence(sequencesRoot: string, id: string): Promise<ProcessSequenceConfig> {
    const sequenceDir = path.join(sequencesRoot, id);
    const packageJsonPath = path.join(sequenceDir, "package.json");
    const packageJson = await readStreamedJSON(createReadStream(packageJsonPath));

    const validPackageJson = await sequencePackageJSONDecoder.decodeToPromise(packageJson);

    return {
        type: "process",
        entrypointPath: validPackageJson.main,
        version: validPackageJson.version ?? "",
        name: validPackageJson.name ?? "",
        id,
        sequenceDir
    };
}

class ProcessSequenceAdapter implements ISequenceAdapter {
    private logger: Logger;

    constructor(private config: STHConfiguration) {
        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        return fs.access(this.config.sequencesRoot)
            .catch(() => fs.mkdir(this.config.sequencesRoot));
    }

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

    async identify(stream: Readable, id: string): Promise<SequenceConfig> {
        const sequenceDir = path.join(this.config.sequencesRoot, id);

        await fs.mkdir(sequenceDir);

        const uncompressingProc = exec(`tar zxf - -C ${sequenceDir}`);

        stream.pipe(uncompressingProc.stdin!);

        await new Promise(res => uncompressingProc.on("close", res));

        return getRunnerConfigForStoredSequence(this.config.sequencesRoot, id);
    }

    async remove(config: SequenceConfig) {
        if (config.type !== "process") {
            throw new Error(`Incorrect SequenceConfig pased to ProcessSequenceAdapter: ${config.type}`);
        }

        const sequenceDir = path.join(this.config.sequencesRoot, config.id);

        return fs.rm(sequenceDir, { recursive: true });
    }
}

export { ProcessSequenceAdapter };
