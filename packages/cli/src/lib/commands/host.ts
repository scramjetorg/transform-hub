import { CommandDefinition } from "../../types";

export const host: CommandDefinition = (program) => {

    const hostCmd = program
        .command("host [command]")
        .description("something");

    hostCmd
        .command("logs")
        .description("show all logs")
        .action(() => {
            console.log("Not implemented");
        });

    hostCmd
        .command("load")
        .description("show load")
        .action(() => {
            console.log("Not implemented");
        });
};
