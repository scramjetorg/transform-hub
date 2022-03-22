import { CommandDefinition } from "../../types";
import { listScopes, deleteScope, getScope, scopeExists } from "../scope";
import { displayObject } from "../output";
import { globalConfig, sessionConfig } from "../config";

/**
 * Initializes `scope` command.
 *
 * @param {Command} program Commander object.
 */
export const scope: CommandDefinition = (program) => {
    const scopeCmd = program
        .command("scope")
        .alias("s")
        .description("Manage scope of the space and hub in temporary file.");

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
        .action((name: string) => {
            if (scopeExists(name)) globalConfig.setScope(name);
        });
    scopeCmd
        .command("delete <name>")
        .description("delete temp scope file")
        .action((name: string) => {
            if (globalConfig.getConfig().scope === name) {
                // eslint-disable-next-line no-console
                console.error(`WARN: can't remove scope ${name} set in configuration.`);
                return;
            }
            if (sessionConfig.getConfig().scope === name) {
                // eslint-disable-next-line no-console
                console.error(`WARN: can't remove currently used scope ${name}`);
                return;
            }
            deleteScope(name);
        });
};
