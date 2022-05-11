/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { sessionConfig } from "../config";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `space` command.
 *
 * @param {Command} program Commander object.
 */
export const space: CommandDefinition = (program) => {
    const spaceCmd = program
        .command("space")
        .addHelpCommand(false)
        .alias("spc")
        .usage("[command] [options...]")
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname")
        .description("operations on grouped and separated runtime environments that allow sharing the data within them");

    if (isDevelopment())
        spaceCmd
            .command("create")
            .argument("<name>")
            .description("TO BE IMPLEMENTED / create the space/workspace if name not provided will be generated")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    spaceCmd
        .command("list")
        .alias("ls")
        .description("list all existing spaces")
        .action(async () => {
            const mwClient = getMiddlewareClient();
            const managers = await mwClient.getManagers();

            console.log(managers);
        });

    spaceCmd
        .command("use")
        .argument("<name>")
        .description("use the space")
        .action(async (name: string) => {
            const mwClient = getMiddlewareClient();
            const managerClient = mwClient.getManagerClient(name);

            console.log("Using space:", { name, ...await managerClient.getVersion() });
            sessionConfig.setLastSpaceId(name);
        });

    if (isDevelopment())
        spaceCmd
            .command("delete")
            .alias("rm")
            .argument("<name|id>")
            .description("TO BE IMPLEMENTED / user can only delete empty space")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    if (isDevelopment())
        spaceCmd
            .command("update")
            .alias("up")
            .argument("<id>", "id of space to update")
            .option("--name", "")
            .description("TO BE IMPLEMENTED / update space parameters")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });
};
