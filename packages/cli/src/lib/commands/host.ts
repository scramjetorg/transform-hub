import { CommandDefinition } from "../../types";
import { getHostClient } from "../common";
import { displayEntity, displayStream } from "../output";

export const host: CommandDefinition = (program) => {
    const hostCmd = program
        .command("host [command]")
        .description("something");

    hostCmd
        .command("version")
        .description("get version")
        .action(async () => displayEntity(program, getHostClient(program).getVersion()));

    hostCmd
        .command("logs")
        .description("show all instances logs")
        .action(async () => displayStream(program, getHostClient(program).getLogStream()));

    hostCmd
        .command("load")
        .description("show load")
        .action(async () => displayEntity(program, getHostClient(program).getLoadCheck()));
};
