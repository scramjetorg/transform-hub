import { CommandCompleterDetails, CompleterDetailsEvent } from "../../events/completerDetails";
import { CommandDefinition, ExtendedHelpConfiguration, isProductionEnv } from "../../types";
import { getReadStreamFromFile } from "../common";
import { profileManager, sessionConfig } from "../config";
import { displayProdOnlyMsg } from "../helpers/messages";
import { displayObject } from "../output";
import { getMiddlewareClient, initPlatform } from "../platform";

/**
 * Initializes `store` command.
 *
 * @param {Command} program Commander object.
 */
export const store: CommandDefinition = (program) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) {
        program.command("store", { hidden: true })
            .action(() => displayProdOnlyMsg("store"));

        return;
    }

    const storeCmd = program
        .command("store")
        .hook("preAction", initPlatform)
        .addHelpCommand(false)
        .configureHelp({ showGlobalOptions: true, developersOnly: true } as ExtendedHelpConfiguration)
        .usage("[command] [options...]")
        .description("Operations on a Store");

    storeCmd
        .command("list")
        .alias("ls")
        .description("Lists all available Sequences in Store")
        .action(async () => {
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);

            displayObject(await managerClient.getStoreItems(), profileManager.getProfileConfig().format);
        });

    storeCmd
        .command("send")
        .argument("<package>", "The file or directory to upload. If directory, it will be packed and sent.")
        .option("--name <name>", "Allows to name sequence")
        .description("Send the Sequence package to the Store")
        .on(CompleterDetailsEvent, (complDetails: CommandCompleterDetails) => {
            complDetails.package = "filenames";
        })
        .action(async (sequencePackage: string, { name }) => {
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);
            const uploadedItem = await managerClient.putStoreItem(
                await getReadStreamFromFile(sequencePackage), name
            );

            displayObject(uploadedItem, profileManager.getProfileConfig().format);
        });

    storeCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
        .description("Delete the Sequence from the Store")
        .action(async (id: string) => {
            const spaceId = sessionConfig.lastSpaceId;
            const managerClient = getMiddlewareClient().getManagerClient(spaceId);

            displayObject(await managerClient.deleteStoreItem(id), profileManager.getProfileConfig().format);
        });
};
