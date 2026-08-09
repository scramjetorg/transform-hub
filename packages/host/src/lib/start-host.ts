import { createServer, ServerConfig } from "@scramjet/api-server";
import { STHConfiguration } from "@scramjet/api-types";
import { Host } from "./host";

function createHost(apiServerConfig: ServerConfig, sthConfig: STHConfiguration) {
    const apiServer = createServer(apiServerConfig);
    const host = new Host(apiServer, sthConfig);

    return host;
}

/**
 * Starts Host module.
 *
 * @param apiServerConfig - api server configuration
 * @param sthConfig - sth configuration
 * @param hostOptions - host options
 */
export async function startHost(
    apiServerConfig: ServerConfig,
    sthConfig: STHConfiguration
): Promise<Host> {
    const host = createHost(apiServerConfig, sthConfig);

    await host.main();

    return host;
}
