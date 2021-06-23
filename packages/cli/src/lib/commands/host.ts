import { CommandDefinition } from "../../types";

import { HostClient } from "@scramjet/api-client";
import { displayEntitiy } from "../output";

export const host: CommandDefinition = (program) => {

    let hostClient: HostClient;

    const getHostClient = () => {
        return hostClient || (hostClient = new HostClient(program.opts().apiUrl));
    };
    const hostCmd = program
        .command("host [command]")
        .description("something");

    hostCmd
        .command("version")
        .description("get version")
        .action(async () => displayEntitiy(program, getHostClient().getVersion()));

    hostCmd
        .command("logs")
        .description("show all logs")
        .action(() => {
            console.log("Not implemented");
        });

    hostCmd
        .command("load")
        .description("show load")
        .action(async () => displayEntitiy(program, getHostClient().getLoadCheck()));
};
