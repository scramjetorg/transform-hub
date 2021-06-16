import { createServer, ServerConfig } from "@scramjet/api-server";
import { Host, HostOptions } from "./host";
import { SocketServer } from "./socket-server";

export async function startHost(
    apiServerConfig: ServerConfig,
    tcpSocketPath: string,
    hostOptions: HostOptions
) {

    const apiServer = createServer(apiServerConfig);
    const tcpServer = new SocketServer(tcpSocketPath);
    const host = new Host(apiServer, tcpServer);

    await host.main(hostOptions);
}

