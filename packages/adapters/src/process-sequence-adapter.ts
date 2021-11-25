import { getLogger } from "@scramjet/logger";
import {
    Logger,
    ProcessSequenceConfig,
    ISequenceAdapter,
    SequenceInfo,
} from "@scramjet/types";
import { Readable } from "stream";
import { createReadStream } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { isValidSequencePackageJSON } from "./validate-sequence-package-json";

const HOME_DIR = require("os").homedir();
const SEQUENCES_DIR = path.join(HOME_DIR, ".scramjet_sequences");

async function getRunnerConfigForStoredSequence(id: string): Promise<ProcessSequenceConfig> {
    const packageJsonPath = path.join(SEQUENCES_DIR, id, "package.json");
    const packageJson = await readStreamedJSON(createReadStream(packageJsonPath));

    if (!isValidSequencePackageJSON(packageJson)) {
        throw new Error("Invalid Scramjet sequence package.json");
    }

    return {
        type: "process",
        sequencePath: packageJson.main,
        version: packageJson.version ?? "",
        name: packageJson.name ?? "",
        id
    };
}

export function getSequenceDir(id: string): string {
    return path.join(SEQUENCES_DIR, id);
}

class ProcessSequenceAdapter implements ISequenceAdapter {
    private logger: Logger;
    private computedInfo: SequenceInfo | null = null

    constructor(info?: SequenceInfo) {
        if (info && info.config.type !== "process") {
            throw new Error("Invalid info config for ProcessSequenceAdapter");
        }

        this.computedInfo = info ?? null;
        this.logger = getLogger(this);
    }

    public get info(): SequenceInfo {
        if (!this.computedInfo) {
            throw new Error("Sequence not identified yet");
        }

        return this.computedInfo;
    }

    async init(): Promise<void> {
        return fs.access(SEQUENCES_DIR)
            .catch(() => fs.mkdir(SEQUENCES_DIR));
    }

    async list(): Promise<ProcessSequenceAdapter[]> {
        const storedSequencesIds = await fs.readdir(SEQUENCES_DIR);
        const sequencesConfigs = await Promise.all(
            storedSequencesIds
                .map(getRunnerConfigForStoredSequence)
                .map((configPromised) => configPromised.catch(() => null))
        );

        this.logger.debug("Listed stored sequences", sequencesConfigs);

        return sequencesConfigs
            .filter(isDefined)
            .map((config): SequenceInfo => ({ id: config.id, config, instances: new Set() }))
            .map((info) => new ProcessSequenceAdapter(info));
    }

    async identify(stream: Readable, id: string): Promise<void> {
        const sequenceDir = getSequenceDir(id);

        await fs.mkdir(sequenceDir);

        const uncompressingProc = exec(`tar zxf - -C ${sequenceDir}`);

        stream.pipe(uncompressingProc.stdin!);

        await new Promise(res => uncompressingProc.on("close", res));

        const config = await getRunnerConfigForStoredSequence(id);

        this.computedInfo = { id: config.id, config, instances: new Set() };
    }

    async cleanup(): Promise<void> {
    }

    async remove() {
        return fs.rm(getSequenceDir(this.info.id), { recursive: true });
    }
}

export { ProcessSequenceAdapter };
