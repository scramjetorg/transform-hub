import { Command } from "commander";

import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { globalConfig, sessionConfig } from "../config";

let middlewareClient: MiddlewareClient;

/**
 * Returns host client for host pointed by command options.
 *
 * @param {Command} command Command object.
 * @returns {MiddlewareClient} Host client.
 */
export const getMiddlewareClient = (command: Command): MiddlewareClient => {
    if (middlewareClient) return middlewareClient;

    const mwUrl = globalConfig.getConfig().middlewareApiUrl;

    if (!mwUrl) {
        throw new Error("Middleware API URL is not specified");
    }

    middlewareClient = new MiddlewareClient(mwUrl);

    if (command.opts().log) {
        middlewareClient.client.addLogger({
            ok(result: any) {
                const { status, statusText, url } = result;

                // eslint-disable-next-line no-console
                console.error("Request ok:", url, `status: ${status} ${statusText}`);
            },
            error(error: any) {
                const { code, reason: result } = error;
                const { message } = result || {};

                // eslint-disable-next-line no-console
                console.error(`Request failed with code "${code}" status: ${message}`);
            },
        });
    }

    return middlewareClient;
};

export const setPlatformDefaults = async (command: Command) => {
    const session = sessionConfig.getConfig();

    if (session.lastSpaceId || session.lastHubId) {
        return false;
    }

    const managers = await getMiddlewareClient(command).getManagers();

    if (!managers.length) {
        return false;
    }

    const managerClient = getMiddlewareClient(command).getManagerClient(managers[0].id);
    const hosts = await managerClient.getHosts();

    if (!hosts.length) {
        return false;
    }

    sessionConfig.setLastSpaceId(managers[0].id);
    sessionConfig.setLastHubId(hosts[0].id);

    // eslint-disable-next-line no-console
    console.log(`Defaults set to: Space: ${managers[0].id}, Hub: ${hosts[0].id}`);

    return true;
};
