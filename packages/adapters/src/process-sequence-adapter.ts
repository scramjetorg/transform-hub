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
import { isValidSequencePackageJSON } from "./validate-sequence-package-json";

async function getRunnerConfigForStoredSequence(sequencesDir: string, id: string): Promise<ProcessSequenceConfig> {
    const packageJsonPath = path.join(sequencesDir, id, "package.json");
    const packageJson = await readStreamedJSON(createReadStream(packageJsonPath));

    if (!isValidSequencePackageJSON(packageJson)) {
        throw new Error("Invalid Scramjet sequence package.json");
    }

    return {
        type: "process",
        entrypointPath: packageJson.main,
        version: packageJson.version ?? "",
        name: packageJson.name ?? "",
        id,
        sequencesDir
    };
}

class ProcessSequenceAdapter implements ISequenceAdapter {
    private logger: Logger;

    constructor(private config: STHConfiguration) {
        this.logger = getLogger(this);
    }

    async init(): Promise<void> {
        return fs.access(this.config.sequencesDir)
            .catch(() => fs.mkdir(this.config.sequencesDir));
    }

    async list(): Promise<SequenceConfig[]> {
        const storedSequencesIds = await fs.readdir(this.config.sequencesDir);
        const sequencesConfigs = await Promise.all(
            storedSequencesIds
                .map((id) => getRunnerConfigForStoredSequence(this.config.sequencesDir, id))
                .map((configPromised) => configPromised.catch(() => null))
        );

        this.logger.debug("Listed stored sequences", sequencesConfigs);

        return sequencesConfigs
            .filter(isDefined);
    }

    async identify(stream: Readable, id: string): Promise<SequenceConfig> {
        const sequenceDir = path.join(this.config.sequencesDir, id);

        await fs.mkdir(sequenceDir);

        const uncompressingProc = exec(`tar zxf - -C ${sequenceDir}`);

        stream.pipe(uncompressingProc.stdin!);

        await new Promise(res => uncompressingProc.on("close", res));

        return getRunnerConfigForStoredSequence(sequenceDir, id);
    }

    async remove(config: SequenceConfig) {
        if (config.type !== "process") {
            throw new Error(`Incorrect SequenceConfig pased to ProcessSequenceAdapter: ${config.type}`);
        }

        const sequenceDir = path.join(this.config.sequencesDir, config.id);

        return fs.rm(sequenceDir, { recursive: true });
    }
}

export { ProcessSequenceAdapter };
