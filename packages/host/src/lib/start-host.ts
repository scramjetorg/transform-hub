import { createServer, ServerConfig } from "@scramjet/api-server";
import { STHConfiguration } from "@scramjet/types";
import { HostBase, HostOptions } from "./host-base";
import { Host } from "./host";
import { HostServerless } from "./host-serverless";
import { SocketServer } from "./socket-server";

/**
 * Starts Host module.
 *
 * @param apiServerConfig - api server configuration
 * @param sthConfig - sth configuration
 * @param hostOptions - host options
 */
export async function startHost<HOST_TYPE extends HostBase = Host>(
    apiServerConfig: ServerConfig,
    sthConfig: STHConfiguration,
    hostOptions: HostOptions
): Promise<HOST_TYPE> {
    let host: any;

    if (sthConfig.serverless) {
        const tcpServer = new SocketServer(sthConfig.host.instancesServerPort);

        host = new HostServerless(tcpServer, sthConfig);
    } else {
        const apiServer = createServer(apiServerConfig);
        const tcpServer = new SocketServer(sthConfig.host.instancesServerPort);

        host = new Host(apiServer, tcpServer, sthConfig);
    }

    return host.main(hostOptions) as HOST_TYPE;
}

