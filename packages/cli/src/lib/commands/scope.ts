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
        .usage("si scope [subcommand] [options...]")
        .description("manage scopes that store pairs of spaces and hubs used when working");
    // FIXME: which description should we leave?
    // .description(
    //     `Create scopes and store pairs of space and hubs
    //      that can be used when working. There can be multiple
    //      scopes, but only one can be used at once.`
    // );

    scopeCmd.command("list").alias("ls").description("list all created scopes").action(listScopes);

    scopeCmd
        .command("print")
        .argument("<name>")
        .description("see json file under the scope")
        .action(async (name: string) => {
            const scopeConfig = getScope(name);

            if (!scopeConfig) {
                // eslint-disable-next-line no-console
                console.error(`Couldn't find scope: ${name}`);
                return;
            }

            await displayObject(program, scopeConfig);
        });

    // FIXME: unable to implement according to draft need change. (colission with hub)
    scopeCmd.command("add").argument("name").argument("<id>", "space").description("add space to specified scope");

    scopeCmd.command("add").argument("name").argument("<apiUrl>", "hub").description("add hub to specified scope");

    scopeCmd
        .command("save")
        .argument("<name>")
        .description("save current chosen space and hub under a scope")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    scopeCmd
        .command("use")
        .argument("<name>")
        .description("work on the selected scope")
        .action((name: string) => {
            if (!scopeExists(name)) {
                // eslint-disable-next-line no-console
                console.error(`Couldn't find scope: ${name}`);
                return;
            }
            sessionConfig.setScope(name);
        });

    scopeCmd
        .command("delete")
        .argument("<name>")
        .description("delete specific scope")
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
