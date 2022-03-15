import { createServer, ServerConfig } from "@scramjet/api-server";
import { STHConfiguration } from "@scramjet/types";
import { HostOptions } from "./host-base";
import { Host } from "./host";
import { SocketServer } from "./socket-server";

/**
 * Starts Host module.
 *
 * @param apiServerConfig - api server configuration
 * @param sthConfig - sth configuration
 * @param hostOptions - host options
 */
export async function startHost(
    apiServerConfig: ServerConfig,
    sthConfig: STHConfiguration,
    hostOptions: HostOptions
): Promise<Host> {
    const apiServer = createServer(apiServerConfig);
    const tcpServer = new SocketServer(sthConfig.host.instancesServerPort);
    const host = new Host(apiServer, tcpServer, sthConfig);

    return host.main(hostOptions);
}

