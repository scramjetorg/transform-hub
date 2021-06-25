import { HostClient } from "@scramjet/api-client";
import { Command } from "commander";

let hostClient: HostClient;

export const getHostClient = (program: Command) => {
    return hostClient || (hostClient = new HostClient(program.opts().apiUrl));
};
