import { CommandDefinition } from "../../types";

/**
 * Initializes `hub` command.
 *
 * @param {Command} program Commander object.
 */
export const hub: CommandDefinition = (program) => {
    const hubCmd = program
        .command("hub")
        .description("allows to run programs in different data centers, computers or devices in local network");

    hubCmd.command("list")
        .alias("ls")
        .description("Not implemented. List all hubs")
        .action(() => {
            throw new Error("Not implemented");
        });

    hubCmd.command("use <name|id>")
        .description("Not implemented. Specify the Hub you want to work with, all subsequent requests will be sent to this Hub")
        .action(() => {
            throw new Error("Not implemented");
        });
};
