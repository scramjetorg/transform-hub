import { createServer, ServerConfig } from "@scramjet/api-server";
import { STHConfiguration } from "@scramjet/types";
import { Host } from "./host";
import { SocketServer } from "./socket-server";

function createHost(apiServerConfig: ServerConfig, sthConfig: STHConfiguration) {
    const apiServer = createServer(apiServerConfig);
    const tcpServer = new SocketServer(sthConfig.host.instancesServerPort, sthConfig.host.hostname);
    const host = new Host(apiServer, tcpServer, sthConfig);

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
