import { InstanceClient, HostClient } from "@scramjet/api-client";
import { access } from "fs/promises";
import { createReadStream, constants } from "fs";
import { resolve } from "path";
import { displayEntity, displayError, displayMessage } from "./output";

import { Readable } from "stream";
import { profileConfig, sessionConfig } from "./config";
import { getMiddlewareClient } from "./platform";
import { isDevelopmentEnv, isProductionEnv } from "../types";

const { F_OK } = constants;

let hostClient: HostClient;

/**
 * Returns host client for host pointed by command options.
 *
 * @returns {HostClient} Host client.
 */
export const getHostClient = (): HostClient => {
    if (hostClient) return hostClient;

    const { apiUrl, env, log: { debug } } = profileConfig.getConfig();
    const { lastSpaceId, lastHubId } = sessionConfig.getConfig();

    if (isDevelopmentEnv(env)) {
        hostClient = new HostClient(apiUrl);
    } else if (isProductionEnv(env)) {
        hostClient = getMiddlewareClient()
            .getManagerClient(lastSpaceId)
            .getHostClient(lastHubId);
    }

    if (debug) {
        hostClient.client.addLogger({
            ok(result) {
                const { status, statusText, url } = result;

                displayMessage(`Request ok: ${url} status: ${status} ${statusText}`);
            },
            end(result) {
                const { url, type } = result;

                displayMessage(`Response ended: ${url} ${{ type }}`);
            },
            error(error) {
                const { code, reason: result } = error;
                const { message } = result || {};

                displayError(`Request failed with code "${code}" status: ${message}`);
            },
        });
    }

    return hostClient;
};

/**
 * Returns instance client for Instance with given `id` on default host.
 *
 * @param {string} id Instance client.
 * @returns {InstanceClient} Instance client.
 */
export const getInstance = (id: string) => InstanceClient.from(id, getHostClient());

/**
 * Attaches stdio to Instance streams.
 *
 * @param {InstanceClient} instanceClient Instance client.
 * @returns {Promise<void>} Promise resolving when all stdio streams finish.
 */
export const attachStdio = (instanceClient: InstanceClient) => {
    return displayEntity(
        Promise.all([
            instanceClient.sendStdin(process.stdin),
            instanceClient.getStream("stdout").then((out) => out.pipe(process.stdout)),
            instanceClient.getStream("stderr").then((err) => err.pipe(process.stderr)),
        ]).then(() => undefined), profileConfig.format);
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
