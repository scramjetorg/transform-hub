import { CommandDefinition } from "../../types";

/**
 * Initializes `space` command.
 *
 * @param {Command} program Commander object.
 */
export const space: CommandDefinition = (program) => {
    const spaceCmd = program
        .command("space")
        .alias("spc")
        .description("operations on grouped and separated runtime environments that allow sharing the data within them");

    spaceCmd.command("create")
        .description("Not implemented. Create the space/workspace if name not provided will be generated")
        .action(() => {
            throw new Error("Not implemented");
        });

    spaceCmd.command("list")
        .alias("ls")
        .description("Not implemented. List all existing spaces")
        .action(() => {
            throw new Error("Not implemented");
        });

    spaceCmd.command("use")
        .description("Not implemented. Use the space")
        .action(() => {
            throw new Error("Not implemented");
        });
};
