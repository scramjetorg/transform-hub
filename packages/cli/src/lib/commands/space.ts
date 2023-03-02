/* eslint-disable no-console */
import { CommandDefinition, isProductionEnv } from "../../types";
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

    spaceCmd
        .command("info")
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
        .action(async () => {
            const mwClient = getMiddlewareClient();

            return displayStream(await mwClient.getAuditStream());
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

    spaceCmd
        .command("accessKey")
        .description("Create access key for adding Hub to Space")
        .argument("[<space_name>]", "The name of the space (defaults to current space)")
        .action(async (spaceName: string) => {
            if (typeof spaceName === "undefined") spaceName = sessionConfig.lastSpaceId;

            const mwClient = getMiddlewareClient();

            displayObject(await mwClient.createAccessKey(spaceName), "json");
        });
};
