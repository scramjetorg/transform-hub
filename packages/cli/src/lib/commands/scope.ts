import { CommandDefinition } from "../../types";

/**
 * Initializes `scope` command.
 *
 * @param {Command} program Commander object.
 */
export const scope: CommandDefinition = (program) => {
    const scopeCmd = program
        .command("scope")
        .alias("s");

    scopeCmd.command("list")
        .alias("ls")
        .description("Not implemented. List scopes")
        .action(() => {
            throw new Error("Not implemented");
        });

    scopeCmd.command("print <name>")
        .description("Not implemented. See json file under the scope file")
        .action(() => {
            throw new Error("Not implemented");
        });

    scopeCmd.command("use")
        .description("Not implemented. use scope under the file name")
        .action(() => {
            throw new Error("Not implemented");
        });

    scopeCmd.command("delete")
        .description("Not implemented. delete temp scope file")
        .action(() => {
            throw new Error("Not implemented");
        });
};
