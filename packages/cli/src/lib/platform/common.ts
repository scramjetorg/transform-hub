import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { profileConfig, sessionConfig } from "../config";
import { displayError, displayMessage } from "../output";

/**
 * Returns host client for host pointed by command options.
 *
 * @returns {MiddlewareClient} Host client.
 */
export const getMiddlewareClient = (): MiddlewareClient => {
    const { middlewareApiUrl, log:{ debug } } = profileConfig.getConfig();

    if (!middlewareApiUrl) {
        throw new Error("Middleware API URL is not specified");
    }

    const middlewareClient = new MiddlewareClient(middlewareApiUrl);

    if (debug) {
        middlewareClient.client.addLogger({
            ok(result: any) {
                const { status, statusText, url } = result;

                displayMessage(`Request ok: ${url} status: ${status} ${statusText}`);
            },
            error(error: any) {
                const { code, reason: result } = error;
                const { message } = result || {};

                displayError(`Request failed with code "${code}" status: ${message}`);
            },
        });
    }

    return middlewareClient;
};

export const setPlatformDefaults = async () => {
    const { lastSpaceId, lastHubId } = sessionConfig.getConfig();

    if (lastSpaceId || lastHubId) {
        return false;
    }

    const middlewareClient = getMiddlewareClient();

    try {
        const managers = await middlewareClient.getManagers();

        if (!managers.length) return false;

        const selectedManager = managers[0];

        const managerClient = middlewareClient.getManagerClient(selectedManager.id);
        const hosts = await managerClient.getHosts();

        if (!hosts.length) return false;

        // Select the first healthy one, if there are none, default to the first one
        const selectedHost = hosts.find((host) => host.healthy) ?? hosts[0];

        sessionConfig.setLastSpaceId(selectedManager.id);
        sessionConfig.setLastHubId(selectedHost.id);

        displayMessage(`Defaults set to: Space: ${selectedManager.id}, Hub: ${selectedHost.id}`);
        return true;
    } catch (_) {
        displayError("Unable to set platform defaults\n");
        return false;
    }
};
