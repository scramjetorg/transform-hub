import { Command } from "commander";

import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { getConfig } from "../config";

let middlewareClient: MiddlewareClient;

/**
 * Returns host client for host pointed by command options.
 *
 * @param {Command} command Command object.
 * @returns {MiddlewareClient} Host client.
 */
export const getMiddlewareClient = (command: Command): MiddlewareClient => {
    if (middlewareClient) return middlewareClient;

    const mwUrl = getConfig().middlewareApiUrl;

    if (!mwUrl) {
        throw new Error("Middleware API URL is not specified");
    }

    middlewareClient = new MiddlewareClient(mwUrl);

    if (command.opts().log) {
        middlewareClient.client.addLogger({
            ok(result) {
                const {
                    status, statusText, url
                } = result;

                // eslint-disable-next-line no-console
                console.error("Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error) {
                const { code, reason: result } = error;
                const { message } = result || {};

                // eslint-disable-next-line no-console
                console.error(`Request failed with code "${code}" status: ${message}`);
            }
        });
    }

    return middlewareClient;
};
