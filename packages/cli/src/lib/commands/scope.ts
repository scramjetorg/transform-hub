/* eslint-disable no-console */
import { cmd, type CommandDescriptor } from "@scramjet/config";
import { isProductionEnv } from "../../types";
import { listScopes, deleteScope, getScope, scopeExists } from "../helpers/scope";
import { displayObject } from "../output";
import { isProfileConfig, ProfileConfig, profileManager } from "../config";
import { displayProdOnlyMsg } from "../helpers/messages";

/**
 * Builds the `scope` command descriptor tree.
 */
export const scopeCommand: CommandDescriptor = cmd("scope", (b) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) {
        b.hidden(true).action(() => displayProdOnlyMsg("scope"));
        return;
    }

    b
        .alias("s")
        .usage("[command] [options...]")
        .desc("/This functionality is under development./ Manage scopes that store pairs of spaces and Hubs used when working")
        .children(
            cmd("list", (c) => {
                c.alias("ls").desc("List all created scopes").action(listScopes);
            }),
            cmd("print", (c) => {
                c
                    .argument("<name>")
                    .desc("See json file under the scope")
                    .action((name: string) => {
                        const scopeConfig = getScope(name);

                        if (!scopeConfig) {
                            throw new Error(`Couldn't find scope: ${name}`);
                        }

                        displayObject(scopeConfig, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("use", (c) => {
                c
                    .argument("<name>")
                    .desc("Work on the selected scope")
                    .action((name: string) => {
                        if (!scopeExists(name)) {
                            throw new Error(`Couldn't find scope: ${name}`);
                        }
                        if (isProfileConfig(profileManager.getProfileConfig())) {
                            (profileManager.getProfileConfig() as ProfileConfig).setScope(name);
                        } else
                            throw new Error("Can't modify user configuration file");
                    });
            }),
            cmd("delete", (c) => {
                c
                    .argument("<name>")
                    .desc("Delete specific scope")
                    .action((name: string) => {
                        if (profileManager.getProfileConfig().scope === name) {
                            throw new Error(`Can't remove currently used scope ${name}`);
                        }
                        deleteScope(name);
                    });
            })
        );
});
