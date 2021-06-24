import { HostClient } from "@scramjet/api-client";
import { CommandDefinition } from "../../types";
import { displayEntity } from "../output";


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
        .action(async () => displayEntity(program, getHostClient().getVersion()));

    hostCmd
        .command("logs")
        .description("show all logs")
        .action(async () => displayEntity(program, getHostClient().getLogStream()));

    hostCmd
        .command("load")
        .description("show load")
        .action(async () => displayEntity(program, getHostClient().getLoadCheck()));
};
