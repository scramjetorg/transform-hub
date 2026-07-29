import { MiddlewareClient } from "@scramjet/middleware-api-client";
import { sessionConfig, profileManager, ProfileConfig } from "../config";
import { displayError, displayMessage } from "../output";
import { ClientUtils, ClientUtilsCustomAgent } from "@scramjet/client-utils";
import { configEnv, isProductionEnv } from "../../types";
import http from "http";
import https from "https";
import { CapabilityUnavailableError } from "../capabilities";
import { shouldAttachApiClientLogger } from "../api-client-logging";

/**
 * Returns host client for host pointed by command options.
 *
 * @returns {MiddlewareClient} Host client.
 */
export const getMiddlewareClient = (): MiddlewareClient => {
    const configuration = profileManager.getProfileConfig().get();
    if (configuration.verser2) throw new CapabilityUnavailableError("Middleware-owned command");
    const { middlewareApiUrl, log:{ debug, apiClients } } = configuration;

    if (!middlewareApiUrl) {
        throw new Error("Middleware API URL is not specified");
    }

    const agent = middlewareApiUrl.startsWith("https") ? https.Agent : http.Agent;
    const middlewareClient = new MiddlewareClient(
        middlewareApiUrl,
        new ClientUtilsCustomAgent(middlewareApiUrl, new agent({ keepAlive: true }))
    );

    if (shouldAttachApiClientLogger(debug, apiClients)) {
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
    const profileConfig = profileManager.getProfileConfig();
    let managers;

    try {
        managers = await middlewareClient.getManagers();
    } catch (_e) {
        (profileConfig as ProfileConfig).setEnv("development");
        throw new Error("Unable to get Space - forbidden access. Setting env to development...");
    }

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
    token: string,
    env: configEnv,
    middlewareApiUrl: string
) =>
    token &&
    isProductionEnv(env) &&
    middlewareApiUrl &&
    !process.argv.includes("--help") &&
    !process.argv.includes("-h");

export const initPlatform = async () => {
    if (!isProductionEnv(profileConfig.env)) return;
    const { token, env, middlewareApiUrl, verser2 } = profileConfig.get();
    if (verser2) return;

    /**
     * Set the default values for platform only when all required settings
     * are provided in the profile configuration.
     * Do not set the default platform values when displaying the help commands.
     */
    if (platformRequirementsValid(token, env, middlewareApiUrl)) {
        ClientUtils.setDefaultHeaders({ Authorization: `Bearer ${token}`, });

        await setPlatformDefaults();
    }
};
