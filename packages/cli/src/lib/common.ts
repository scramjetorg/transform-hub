import { InstanceClient, HostClient } from "@scramjet/api-client";
import { Command } from "commander";
import { access, readdir } from "fs/promises";
import { createReadStream, createWriteStream, constants, PathLike } from "fs";
import { resolve } from "path";
import { displayEntity } from "./output";
import { c } from "tar";
import { StringStream } from "scramjet";
import { filter as mmfilter } from "minimatch";
import { Readable } from "stream";
import { globalConfig, sessionConfig } from "./config";
import { getMiddlewareClient } from "./platform";

const { F_OK, R_OK } = constants;

let hostClient: HostClient;

/**
 * Returns host client for host pointed by command options.
 *
 * @returns {HostClient} Host client.
 */
export const getHostClient = (): HostClient => {
    if (hostClient) return hostClient;

    const { lastSpaceId, lastHubId, apiUrl } = sessionConfig.getConfig();
    const { env, log } = globalConfig.getConfig();

    if (globalConfig.isDevelopmentEnv(env)) {
        hostClient = new HostClient(apiUrl);
    } else if (globalConfig.isProductionEnv(env)) {
        hostClient = getMiddlewareClient()
            .getManagerClient(lastSpaceId)
            .getHostClient(lastHubId);
    }

    if (log) {
        hostClient.client.addLogger({
            ok(result) {
                const { status, statusText, url } = result;

                // eslint-disable-next-line no-console
                console.error("Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error) {
                const { code, reason: result } = error;
                const { message } = result || {};

                // eslint-disable-next-line no-console
                console.error(`Request failed with code "${code}" status: ${message}`);
            },
        });
    }

    return hostClient;
};

/**
 * Returns instance client for instance with given `id` on default host.
 *
 * @param {string} id Instance client.
 * @returns {InstanceClient} Instance client.
 */
export const getInstance = (id: string) => InstanceClient.from(id, getHostClient());

/**
 * Attaches stdio to instance streams.
 *
 * @param {Command} command Command object.
 * @param {InstanceClient} instanceClient Instance client.
 * @returns {Promise<void>} Promise resolving when all stdio streams finish.
 */
export const attachStdio = (command: Command, instanceClient: InstanceClient) => {
    return displayEntity(
        Promise.all([
            instanceClient.sendStdin(process.stdin),
            instanceClient.getStream("stdout").then((out) => out.pipe(process.stdout)),
            instanceClient.getStream("stderr").then((err) => err.pipe(process.stderr)),
        ]).then(() => undefined)
    );
};

/**
 * TODO: Comment.
 *
 * @param {PathLike} file Filepath to read rules from.
 * @returns TODO: Comment.
 */
export const getIgnoreFunction = async (file: PathLike) => {
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
export const packAction = async (directory: string, { stdout, output }: { stdout: boolean; output: string }) => {
    const cwd = resolve(process.cwd(), directory);
    const packageLocation = resolve(cwd, "package.json");

    // TODO: error handling?
    // TODO: check package contents?
    await access(packageLocation, F_OK | R_OK).catch(() => {
        throw new Error(`${packageLocation} not found.`);
    });

    const ouputPath = output ? resolve(process.cwd(), output) : `${cwd}.tar.gz`;
    const target = stdout ? process.stdout : createWriteStream(ouputPath);

    if (!stdout) sessionConfig.setLastPackagePath(ouputPath);

    const ignoreLocation = resolve(cwd, ".siignore");
    const filter = await getIgnoreFunction(ignoreLocation);
    const out = c(
        {
            gzip: true,
            cwd,
            filter,
        },
        await readdir(directory)
    ).pipe(target);

    await new Promise((res, rej) => {
        out.on("finish", res);
        out.on("error", rej);
    });
};

/**
 * Get stream from file.
 *
 * @param {string} file Path to file to read from.
 * @returns {Promise<Readable>} Promise resolving to stream with file contents.
 */
export const getReadStreamFromFile = async (file: string): Promise<Readable> => {
    const resolvedFilePath = resolve(process.cwd(), file);

    return access(resolvedFilePath, F_OK)
        .then(() => createReadStream(resolvedFilePath))
        .catch(() => {
            throw new Error(`File "${file}" not found.`);
        });
};
