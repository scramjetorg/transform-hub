import { getLogger } from "@scramjet/logger";
import {
    Logger,
    ProcessSequenceConfig,
    ISequenceAdapter,
    ISequenceInfo,
    isValidSequencePackageJSON } from "@scramjet/types";
import { Readable } from "stream";
import { createReadStream, createWriteStream, existsSync } from "fs";
import { mkdir, readdir, rm } from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { isDefined, readStreamedJSON } from "@scramjet/utility";
import { SequenceInfo } from "./sequence-info";

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
    private computedInfo: ISequenceInfo | null = null

    constructor(info?: ISequenceInfo) {
        if (info && info.getConfig().type !== "process") {
            throw new Error("Invalid info config for ProcessSequenceAdapter");
        }

        this.computedInfo = info ?? null;
        this.logger = getLogger(this);
    }

    public get info(): ISequenceInfo {
        if (!this.computedInfo) {
            throw new Error("Sequence not identified yet");
        }

        return this.computedInfo;
    }

    async init(): Promise<void> {
        if (!existsSync(SEQUENCES_DIR)) {
            await mkdir(SEQUENCES_DIR);
        }
    }

    async list(): Promise<ProcessSequenceAdapter[]> {
        const storedSequencesIds = await readdir(SEQUENCES_DIR);
        const sequencesConfigs = await Promise.all(
            storedSequencesIds
                .map(getRunnerConfigForStoredSequence)
                .map((configPromised) => configPromised.catch(() => null))
        );

        this.logger.debug("Listed stored sequences", sequencesConfigs);

        return sequencesConfigs
            .filter(isDefined)
            .map((config) => new SequenceInfo(config))
            .map((info) => new ProcessSequenceAdapter(info));
    }

    async identify(stream: Readable, id: string): Promise<void> {
        const sequenceDir = getSequenceDir(id);

        await mkdir(sequenceDir);

        const compressedPath = path.join(sequenceDir, "compressed.tar.gz");
        const savingFileStream = stream.pipe(createWriteStream(compressedPath));

        this.logger.log(`Writing compressed sequence to ${compressedPath}`);
        await new Promise(res => savingFileStream.on("close", res));

        // @TODO pass input stream
        const uncompressingProc = exec(`tar xvf ${compressedPath}  -C ${sequenceDir}`);

        await new Promise(res => uncompressingProc.on("close", res));

        const config = await getRunnerConfigForStoredSequence(id);

        this.computedInfo = new SequenceInfo(config);
    }

    async cleanup(): Promise<void> {
        return rm(getSequenceDir(this.info.getId()), { recursive: true });
    }

    async remove() {
        //noop
    }
}

export { ProcessSequenceAdapter };
