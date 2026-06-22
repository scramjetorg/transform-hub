import { IDProvider } from "@scramjet/model";
import type { IObjectLogger } from "@scramjet/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

export type HostInfoFile = {
    id?: string;
    [key: string]: unknown;
};

export function writeHostInfoFile(infoFilePath: string, info: object): void {
    mkdirSync(dirname(infoFilePath), { recursive: true });
    writeFileSync(infoFilePath, JSON.stringify(info));
}

export function readHostInfoFile(infoFilePath: string, logger: Pick<IObjectLogger, "warn" | "error">): HostInfoFile {
    let fileContents = "";

    try {
        fileContents = readFileSync(infoFilePath, { encoding: "utf-8" });
    } catch {
        logger.warn("Can not read id file");

        return {};
    }

    try {
        return JSON.parse(fileContents);
    } catch (err) {
        logger.error("Can not parse id file", err);

        return {};
    }
}

export function resolveStableHostId(configuredId: string | undefined, infoFilePath: string, logger: Pick<IObjectLogger, "info" | "warn" | "error">): string {
    if (configuredId) {
        logger.info("Initialized with custom id", configuredId);
        return configuredId;
    }

    const info = existsSync(infoFilePath) ? readHostInfoFile(infoFilePath, logger) : {};

    if (info.id) {
        logger.info("Initialized with id", info.id);
        return info.id;
    }

    const generatedId = IDProvider.generate();

    writeHostInfoFile(infoFilePath, { ...info, id: generatedId });
    logger.info("Generated local id", generatedId);

    return generatedId;
}
