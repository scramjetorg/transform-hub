import { CommandDefinition, isProductionEnv } from "../../types";
import { getReadStreamFromFile } from "../common";
import { profileConfig, sessionConfig } from "../config";
import { displayObject } from "../output";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `store` command.
 *
 * @param {Command} program Commander object.
 */
export const store: CommandDefinition = (program) => {
    const isProdEnv = isProductionEnv(profileConfig.env);

    if (!isProdEnv) return;

    const storeCmd = program
        .command("store")
        .addHelpCommand(false)
        .usage("[command] [options...]")
        .description("Operations on a Store");

    storeCmd
        .command("list")
        .alias("ls")
        .description("Lists all available Sequences in Store")
        .action(async () => {
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);

            displayObject(await managerClient.getStoreItems(), profileConfig.format);
        });

    storeCmd
        .command("send")
        .argument("<package>", "The file or directory to upload. If directory, it will be packed and send.")
        .option("--name <name>", "Allows to name sequence")
        .description("Send the Sequence package to the Store")
        .action(async (sequencePackage: string, { name }) => {
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);
            const uploadedItem = await managerClient.putStoreItem(
                await getReadStreamFromFile(sequencePackage), name
            );

            displayObject(uploadedItem, profileConfig.format);
        });

    storeCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
        .description("Delete the Sequence from the Store")
        .action(async (id: string) => {
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);

            displayObject(await managerClient.deleteStoreItem(id), profileConfig.format);
        });
};
