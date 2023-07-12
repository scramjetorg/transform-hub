
import { GetSequenceResponse } from "@scramjet/types/src/rest-api-sth";
import { InstanceLimits } from "@scramjet/types";
import { constants, createReadStream, createWriteStream, PathLike } from "fs";
import { readFile, readdir, access, lstat } from "fs/promises";
import { InstanceClient, SequenceClient } from "@scramjet/api-client";
import { getPackagePath, getSequenceId, sessionConfig } from "../config";
import { defer, promiseTimeout } from "@scramjet/utility";
import { getHostClient, getReadStreamFromFile } from "../common";
import { displayMessage } from "../output";
import { c } from "tar";
import { Writable } from "stream";
import { resolve } from "path";
import { StringStream } from "scramjet";
import { filter as mmfilter } from "minimatch";
import * as fs from "fs";
import { EOL } from "os";

const { F_OK, R_OK } = constants;

type SequenceUploadOptions = {
    name?: string;
}

/**
 * TODO: Comment.
 *
 * @param {PathLike} file Filepath to read rules from.
 * @returns TODO: Comment.
 */
const getIgnoreFunction = async (file: PathLike) => {
    try {
        await access(file, R_OK);
    } catch {
        return () => true;
    }

    const rules: ReturnType<typeof mmfilter>[] = await StringStream.from(createReadStream(file))
        .lines()
        .filter((line: string) => line.substr(0, line.indexOf("#")).trim() === "")
        .parse((line: string) => mmfilter(line))
        .catch(() => undefined)
        .toArray();
    const fakeArr: string[] = [];

    return (f: string) => !rules.find((x) => x(f, 0, fakeArr));
};

/**
 * Creates package with contents of given directory.
 *
 * @param {string} directory Directory to be packaged.
 * @param {boolean} stdout If true, package will be piped to stdout.
 * @param {output} string Output filename.
 */
export const sequencePack = async (directory: string, { output }: { output: Writable }) => {
    const cwd = resolve(process.cwd(), directory);
    const packageLocation = resolve(cwd, "package.json");

    // TODO: error handling?
    // TODO: check package contents?
    await access(packageLocation, F_OK | R_OK).catch(() => {
        return Promise.reject(new Error(`${packageLocation} not found.`));
    });

    const ignoreLocation = resolve(cwd, ".siignore");
    const filter = await getIgnoreFunction(ignoreLocation);
    const out = c(
        {
            gzip: true,
            cwd,
            filter,
        },
        await readdir(directory)
    ).pipe(output);

    await new Promise((res, rej) => {
        out.on("finish", res);
        out.on("error", rej);
    });
};

export const sequenceSendPackage = async (
    sequencePackage: string, options: SequenceUploadOptions = {}, update = false, config: { progress?: boolean } = {}
): Promise<SequenceClient> => {
    try {
        const id = getSequenceId(options.name!);

        let sequencePath = getPackagePath(sequencePackage);

        if ((await lstat(sequencePath)).isDirectory()) {
            await sequencePack(sequencePackage, { output: createWriteStream(`${sequencePackage}.tar.gz`) });
            sequencePath = `${sequencePackage}.tar.gz`;
        }

        let seq: SequenceClient;
        const sequenceStream = await getReadStreamFromFile(sequencePath);

        if (config.progress) {
            const barSize = 24;
            let total = 0;
            let text = "";

            const { size } = fs.statSync(sequencePackage);

            sequenceStream.on("data", async (chunk: Buffer) => {
                total += chunk.length;

                if (total <= size) {
                    const proc = Math.round(total / size * 100);
                    const filledCount = Math.floor(proc * (barSize / 100));

                    text = `Uploading ${"".padEnd(filledCount, "█") + "".padEnd(barSize - filledCount, "░")} ${proc}%, ${total >>> 10}/${Math.floor(size >>> 10)}KB`;

                    process.stderr.write(text);
                    process.stderr.moveCursor(-text.length, 0);
                }

                if (total === size) {
                    text = `Sequence package uploaded (size ${Math.round(size >>> 10)}KB)`.padEnd(text.length, " ") + EOL;
                    process.stderr.write(text);
                }
            }).pause();
        }

        if (update) {
            seq = await getHostClient().getSequenceClient(id)?.overwrite(
                sequenceStream,
            );
        } else {
            const headers: HeadersInit = {};

            if (options.name) {
                headers["x-name"] = options.name;
            }

            seq = await getHostClient().sendSequence(
                sequenceStream,
                { headers }
            );
        }

        sessionConfig.setLastSequenceId(seq.id);

        return seq;
    } catch (e: any) {
        return Promise.reject(e);
    }
};

export const sequenceStart = async (
    id: string, { configFile, configString, args, outputTopic, inputTopic, limits }:
        {
            configFile: any,
            configString: string,
            args?: any[],
            outputTopic?: string,
            inputTopic?: string,
            limits?: InstanceLimits,
            name?: string
        }
): Promise<InstanceClient> => {
    if (configFile && configString) {
        return Promise.reject(new Error("Provide one source of configuration"));
    }

    let appConfig = {};

    try {
        if (configString) appConfig = JSON.parse(configString);
        if (configFile) appConfig = JSON.parse(await readFile(configFile, "utf-8"));
    } catch (_) {
        return Promise.reject(new Error("Unable to read configuration"));
    }
    const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient());

    try {
        const instance = await sequenceClient.start({ appConfig, args, outputTopic, inputTopic, limits });

        sessionConfig.setLastInstanceId(instance.id);
        return Promise.resolve(instance);
    } catch (error: any) {
        return Promise.reject(error);
    }
};

export function sequenceParseArgs(argsStr: string): any[] {
    let args;

    try {
        args = JSON.parse(argsStr);
    } catch (err) {
        throw new Error(`Error while parsing the provided Instance arguments. '${(err as Error).message}'`);
    }
    if (!Array.isArray(args))
        throw new Error("Arguments must be in array");

    return args;
}

export const sequenceDelete = async (
    id: string, opts = { force: false }, lastSequenceId = sessionConfig.lastSequenceId
) => {
    const deleteSequenceResponse = await getHostClient().deleteSequence(getSequenceId(id), opts);

    if (lastSequenceId === id) {
        sessionConfig.setLastSequenceId("");
    }
    return deleteSequenceResponse;
};

export const waitForInstanceKills = (seq: GetSequenceResponse, timeout: number) => {
    return promiseTimeout((async () => {
        let l;

        // eslint-disable-next-line no-cond-assign
        while (l = (await getHostClient().getSequence(seq.id)).instances.length) {
            displayMessage(`Sequence ${seq.id}. Waiting for ${l} instance${l > 1 ? "s" : ""} to finish...`);
            await defer(1000);
        }
        return Promise.resolve();
    })(), timeout);
};
