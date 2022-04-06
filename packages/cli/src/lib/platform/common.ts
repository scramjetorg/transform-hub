import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { globalConfig, sessionConfig } from "../config";

/**
 * Returns host client for host pointed by command options.
 *
 * @returns {MiddlewareClient} Host client.
 */
export const getMiddlewareClient = (): MiddlewareClient => {
    const { middlewareApiUrl, debug } = globalConfig.getConfig();

    if (!middlewareApiUrl) {
        throw new Error("Middleware API URL is not specified");
    }

    const middlewareClient = new MiddlewareClient(middlewareApiUrl);

    if (debug) {
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

export const setPlatformDefaults = async () => {
    const session = sessionConfig.getConfig();

    if (session.lastSpaceId || session.lastHubId) {
        return false;
    }

    const middlewareClient = getMiddlewareClient();

    try {
        const managers = await middlewareClient.getManagers();

        if (!managers.length) return false;

        const managerClient = middlewareClient.getManagerClient(managers[0].id);
        const hosts = await managerClient.getHosts();

        if (!hosts.length) return false;

        sessionConfig.setLastSpaceId(managers[0].id);
        sessionConfig.setLastHubId(hosts[0].id);

        // eslint-disable-next-line no-console
        console.log(`Defaults set to: Space: ${managers[0].id}, Hub: ${hosts[0].id}`);

        return true;
    } catch (_) {
        // eslint-disable-next-line no-console
        console.error("Warning: Unable to set platform defaults\n");
        return false;
    }
};
