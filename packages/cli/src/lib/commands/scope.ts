import { CommandDefinition } from "../../types";
import { listScopes, deleteScope, getScope, useScope } from "../scope";
import { displayObject } from "../output";

/**
 * Initializes `scope` command.
 *
 * @param {Command} program Commander object.
 */
export const scope: CommandDefinition = (program) => {
    const scopeCmd = program
        .command("scope [command] [options...]")
        .alias("s")
        .description("Manage scope of the space and hub in temporary file.");
    // FIXME: output slightly differs from draft proposition

    scopeCmd.command("list").alias("ls").description("list scope files").action(listScopes);
    scopeCmd
        .command("print <name>")
        .description("see json file under the scope file")
        .action(async (name: string) => {
            const scopeConfig = getScope(name);

            if (!scopeConfig) return;
            await displayObject(program, scopeConfig);
        });
    scopeCmd
        .command("use <name>")
        .description("use scope under the file name")
        .action((name: string) => useScope(name));
    scopeCmd
        .command("delete <name>")
        .description("delete temp scope file")
        .action((name: string) => deleteScope(name));
};
