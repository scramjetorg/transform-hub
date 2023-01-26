/* eslint-disable no-console */
import { CommandDefinition, isProductionEnv } from "../../types";
import { isDevelopment } from "../../utils/envs";
import { profileManager, sessionConfig } from "../config";
import { displayObject, displayStream } from "../output";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `space` command.
 *
 * @param {Command} program Commander object.
 */
export const space: CommandDefinition = (program) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) return;

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
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);
            const version = await managerClient.getVersion();

            displayObject({ spaceId, version, managerClient }, profileManager.getProfileConfig().format);
        });

    spaceCmd
        .command("list")
        .alias("ls")
        .description("List all existing spaces")
        .action(async () => {
            const mwClient = getMiddlewareClient();
            const managers = await mwClient.getManagers();

            return displayObject(managers, profileManager.getProfileConfig().format);
        });

    spaceCmd
        .command("use")
        .argument("<name>")
        .description("Use the space")
        .action(async (name: string) => {
            const mwClient = getMiddlewareClient();
            const managerClient = mwClient.getManagerClient(name);

            displayObject({ name, ...await managerClient.getVersion() }, profileManager.getProfileConfig().format);
            sessionConfig.setLastSpaceId(name);
        });

    spaceCmd
        .command("audit")
        .description("Fetch all audit messages from spaces")
        // .argument("[<spacename>]", "The name of the space (defaults to all spaces)")
        .action(async () => {
            const mwClient = getMiddlewareClient();

            // if (typeof spacename === "undefined")
            return displayStream(await mwClient.getAuditStream());

            // const managerClient = mwClient.getManagerClient(spacename);

            // return displayStream(await managerClient.getAuditStream());
        });

    spaceCmd
        .command("logs")
        .description("Fetch all logs from space")
        .argument("[<space_name>]", "The name of the space (defaults to current space)")
        .action(async (spaceName: string) => {
            if (typeof spaceName === "undefined") spaceName = sessionConfig.lastSpaceId;

            const mwClient = getMiddlewareClient();
            const managerClient = mwClient.getManagerClient(spaceName);

            await displayStream(await managerClient.getLogStream());
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
