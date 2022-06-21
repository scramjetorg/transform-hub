/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { listScopes, deleteScope, getScope, scopeExists } from "../scope";
import { displayError, displayObject } from "../output";
import { profileConfig } from "../config";
import { isDevelopment } from "../../utils/envs";

/**
 * Initializes `scope` command.
 *
 * @param {Command} program Commander object.
 */
export const scope: CommandDefinition = (program) => {
    const scopeCmd = program
        .command("scope")
        .addHelpCommand(false)
        .alias("s")
        .usage("[command] [options...]")
        .description("Manage scopes that store pairs of spaces and Hubs used when working");

    scopeCmd.command("list").alias("ls").description("List all created scopes").action(listScopes);

    scopeCmd
        .command("print")
        .argument("<name>")
        .description("See json file under the scope")
        .action((name: string) => {
            const scopeConfig = getScope(name);

            if (!scopeConfig) {
                displayError(`Couldn't find scope: ${name}`);
                return;
            }

            displayObject(scopeConfig, profileConfig.format);
        });

    if (isDevelopment())
        scopeCmd
            .command("add")
            .argument("<name>")
            .option("--hub <name> <id>", "Add a Hub to specified scope")
            .option("--space <name> <apiUrl>", "Add space to specified scope")
            .description("TO BE IMPLEMENTED / Add a Hub or space to specified scope")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    if (isDevelopment())
        scopeCmd
            .command("save")
            .argument("<name>")
            .description("TO BE IMPLEMENTED / Save current chosen space and Hub under a scope name")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    scopeCmd
        .command("use")
        .argument("<name>")
        .description("Work on the selected scope")
        .action((name: string) => {
            if (!scopeExists(name)) {
                displayError(`Couldn't find scope: ${name}`);
                return;
            }
            profileConfig.setScope(name);
        });

    scopeCmd
        .command("delete")
        .argument("<name>")
        .description("Delete specific scope")
        .action((name: string) => {
            if (profileConfig.getConfig().scope === name) {
                displayError(`Can't remove scope ${name} set in configuration.`);
                return;
            }
            if (profileConfig.getConfig().scope === name) {
                displayError(`Can't remove currently used scope ${name}`);
                return;
            }
            deleteScope(name);
        });
};
