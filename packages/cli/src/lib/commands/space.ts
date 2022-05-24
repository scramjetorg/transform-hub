/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { sessionConfig } from "../config";
import { displayObject } from "../output";
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
        .option("-c, --stdout", "Output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .description("Operations on grouped and separated runtime environments that allow sharing the data within them");

    if (isDevelopment())
        spaceCmd
            .command("create")
            .argument("<name>")
            .description("TO BE IMPLEMENTED / Create the space/workspace if name not provided will be generated")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    spaceCmd
        .command("info")
        /* TODO for future use
    .argument("[<name>|<id>]")
    // eslint-disable-next-line max-len
    .description("display chosen space version if a name|id is not provided it displays a version of a current space")
    */
        .description("Display info about the default space")
        .action(async () => {
            const spaceId = sessionConfig.getConfig().lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);
            const version = await managerClient.getVersion();

            displayObject({ spaceId });
            displayObject(version);
            displayObject(managerClient);
        });

    spaceCmd
        .command("list")
        .alias("ls")
        .description("List all existing spaces")
        .action(async () => {
            const mwClient = getMiddlewareClient();
            const managers = await mwClient.getManagers();

            return displayObject(managers);
        });

    spaceCmd
        .command("use")
        .argument("<name>")
        .description("Use the space")
        .action(async (name: string) => {
            const mwClient = getMiddlewareClient();
            const managerClient = mwClient.getManagerClient(name);

            displayObject({ name, ...await managerClient.getVersion() });
            sessionConfig.setLastSpaceId(name);
        });

    if (isDevelopment())
        spaceCmd
            .command("delete")
            .alias("rm")
            .argument("<name|id>")
            .description("TO BE IMPLEMENTED / User can only delete empty space")
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
            .description("TO BE IMPLEMENTED / Update space parameters")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });
};
