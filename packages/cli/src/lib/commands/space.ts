/* eslint-disable no-console */
import { PostDisconnectPayload } from "@scramjet/types/src/rest-api-manager";
import { CommandDefinition, isProductionEnv } from "../../types";
import { profileManager, sessionConfig } from "../config";
import { displayObject, displayStream } from "../output";
import { getMiddlewareClient } from "../platform";
import { displayProdOnlyMsg } from "../helpers/messages";

/**
 * Initializes `space` command.
 *
 * @param {Command} program Commander object.
 */
export const space: CommandDefinition = (program) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) {
        program.command("space", { hidden: true })
            .action(() => displayProdOnlyMsg("space"));

        return;
    }
    const mwClient = getMiddlewareClient();

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
            const managerClient = mwClient.getManagerClient(spaceId);
            const version = await managerClient.getVersion();

            displayObject({ spaceId, version, managerClient }, profileManager.getProfileConfig().format);
        });

    spaceCmd
        .command("list")
        .alias("ls")
        .description("List all existing spaces")
        .action(async () => {
            const managers = await mwClient.getManagers();

            return displayObject(managers, profileManager.getProfileConfig().format);
        });

    spaceCmd
        .command("use")
        .argument("<name>")
        .description("Use the space")
        .action(async (name: string) => {
            const managerClient = mwClient.getManagerClient(name);

            displayObject({ name, ...await managerClient.getVersion() }, profileManager.getProfileConfig().format);
            sessionConfig.setLastSpaceId(name);
        });

    spaceCmd
        .command("audit")
        .description("Fetch all audit messages from spaces")
        .action(async () => {
            return displayStream(await mwClient.getAuditStream());
        });

    spaceCmd
        .command("logs")
        .description("Fetch all logs from space")
        .argument("[<space_name>]", "The name of the space (defaults to current space)")
        .action(async (spaceName: string) => {
            if (typeof spaceName === "undefined") spaceName = sessionConfig.lastSpaceId;

            const managerClient = mwClient.getManagerClient(spaceName);

            await displayStream(await managerClient.getLogStream());
        });

    spaceCmd
        .command("disconnect")
        .description("Disconnect self hosted Hubs from space")
        .argument("<space_name>", "The name of the Space")
        .option("--id <id>", "Hub Id")
        .option("--all", "Disconnects all self-hosted Hubs connected to Space", false)
        .action(async (spaceName: string, options: { id: string, all: boolean }) => {
            const managerClient = mwClient.getManagerClient(spaceName);
            let opts = { } as PostDisconnectPayload;

            if (typeof options.id === "string") {
                opts = { id: options.id };
            }

            if (options.all) {
                opts = { limit: 0 };
            }

            if (!Object.keys(opts).length) {
                throw new Error("Missing --id or --all");
            }

            displayObject(await managerClient.disconnectHubs(opts), profileManager.getProfileConfig().format);
        });
    spaceCmd
        .command("version")
        .description("Display space version")
        .action(async () => {
            const spaceName = sessionConfig.lastSpaceId;
            const managerClient = mwClient.getManagerClient(spaceName);
            const version = await managerClient.getVersion();

            displayObject(version, profileManager.getProfileConfig().format);
        });
    const accessKeyCmd = spaceCmd
        .command("access")
        .description("Manages Access Keys for active Space");

    accessKeyCmd.command("create")
        .argument("<description>", "Key description")
        .description("Create Access key for adding Hubs to active Space, i.e \"Army of Darkness\"")
        .action(async (description: string) => {
            const spaceName = sessionConfig.lastSpaceId;

            if (!spaceName) {
                throw new Error("No Space set");
            }

            const accessKey = await mwClient.createAccessKey(spaceName, { description });

            displayObject(accessKey, profileManager.getProfileConfig().format);
        });

    accessKeyCmd.command("list")
        .alias("ls")
        .description("List Access Keys metadata in active Space")
        .action(async () => {
            const spaceName = sessionConfig.lastSpaceId;

            if (!spaceName) {
                throw new Error("No Space set");
            }

            displayObject(await mwClient.listAccessKeys(spaceName), profileManager.getProfileConfig().format);
        });

    accessKeyCmd.command("revoke")
        .description("Revokes Access Key in active Space")
        .argument("<access_key>", "Access Key id")
        .action(async (accessKey: string) => {
            const spaceName = sessionConfig.lastSpaceId;

            if (!spaceName) {
                throw new Error("No Space set");
            }

            const revokedAccessKey = await mwClient.revokeAccessKey(spaceName, accessKey);

            displayObject(revokedAccessKey, profileManager.getProfileConfig().format);
        });
};
