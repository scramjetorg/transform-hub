/* eslint-disable no-console */
import { CommandDefinition, isProductionEnv } from "../../types";
import { listScopes, deleteScope, getScope, scopeExists } from "../helpers/scope";
import { displayObject } from "../output";
import { isProfileConfig, ProfileConfig, profileManager } from "../config";

/**
 * Initializes `scope` command.
 *
 * @param {Command} program Commander object.
 */
export const scope: CommandDefinition = (program) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) return;

    const scopeCmd = program
        .command("scope")
        .addHelpCommand(false)
        .alias("s")
        .usage("[command] [options...]")
        .description("/This functionality is under development./ Manage scopes that store pairs of spaces and Hubs used when working");

    scopeCmd.command("list").alias("ls").description("List all created scopes").action(listScopes);

    scopeCmd
        .command("print")
        .argument("<name>")
        .description("See json file under the scope")
        .action((name: string) => {
            const scopeConfig = getScope(name);

            if (!scopeConfig) {
                throw new Error(`Couldn't find scope: ${name}`);
            }

            displayObject(scopeConfig, profileManager.getProfileConfig().format);
        });

    scopeCmd
        .command("use")
        .argument("<name>")
        .description("Work on the selected scope")
        .action((name: string) => {
            if (!scopeExists(name)) {
                throw new Error(`Couldn't find scope: ${name}`);
            }
            if (isProfileConfig(profileManager.getProfileConfig())) {
                (profileManager.getProfileConfig() as ProfileConfig).setScope(name);
            } else
                throw new Error("Can't modify user configuration file");
        });

    scopeCmd
        .command("delete")
        .argument("<name>")
        .description("Delete specific scope")
        .action((name: string) => {
            if (profileManager.getProfileConfig().scope === name) {
                throw new Error(`Can't remove currently used scope ${name}`);
            }
            deleteScope(name);
        });
};
