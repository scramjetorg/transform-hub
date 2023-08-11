import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { sessionConfig, profileManager } from "../config";
import { displayError, displayMessage } from "../output";
import { ClientUtils } from "@scramjet/client-utils";
import { configEnv, isProductionEnv } from "../../types";
import { Command } from "commander";

/**
 * Returns host client for host pointed by command options.
 *
 * @returns {MiddlewareClient} Host client.
 */
export const getMiddlewareClient = (): MiddlewareClient => {
    const { middlewareApiUrl, log:{ debug } } = profileManager.getProfileConfig().get();

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
    const middlewareClient = getMiddlewareClient();
    const managers = await middlewareClient.getManagers();

    const { lastSpaceId, lastHubId } = sessionConfig.get();

    if (lastSpaceId || lastHubId) {
        if (managers[0]?.id === lastSpaceId) {
            return false;
        }
    }

    try {
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

const profileConfig = profileManager.getProfileConfig();
const platformRequirementsValid = (
    program: Command & { _helpShortFlag?: any, _helpLongFlag?: any },
    token: string,
    env: configEnv,
    middlewareApiUrl: string
) =>
    token &&
    isProductionEnv(env) &&
    middlewareApiUrl &&
    !process.argv.includes(program._helpShortFlag) &&
    !process.argv.includes(program._helpLongFlag);

export const initPlatform = async (program: Command) => {
    const { token, env, middlewareApiUrl } = profileConfig.get();

    /**
     * Set the default values for platform only when all required settings
     * are provided in the profile configuration.
     * Do not set the default platform values when displaying the help commands.
     */
    if (platformRequirementsValid(program, token, env, middlewareApiUrl)) {
        ClientUtils.setDefaultHeaders({ Authorization: `Bearer ${token}`, });

        await setPlatformDefaults();
    }
};
