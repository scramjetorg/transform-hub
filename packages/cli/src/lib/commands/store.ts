import { cmd, type CommandDescriptor } from "@scramjet/config";
import { isProductionEnv } from "../../types";
import { getReadStreamFromFile } from "../common";
import { profileManager, sessionConfig } from "../config";
import { displayProdOnlyMsg } from "../helpers/messages";
import { displayMessage, displayObject } from "../output";
import { getMiddlewareClient } from "../platform";

/**
 * Builds the `store` command descriptor tree.
 */
export const storeCommand: CommandDescriptor = cmd("store", (b) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) {
        b.hidden(true).action(() => displayProdOnlyMsg("store"));
        return;
    }

    b
        .usage("[command] [options...]")
        .meta("developersOnly", true)
        .desc("Operations on a Store")
        .children(
            cmd("list", (c) => {
                c
                    .alias("ls")
                    .desc("Lists all available Sequences in Store")
                    .action(async () => {
                        const spaceId = sessionConfig.lastSpaceId;
                        const managerClient = getMiddlewareClient().getManagerClient(spaceId);

                        displayObject(await managerClient.getStoreItems(), profileManager.getProfileConfig().format);
                    });
            }),
            cmd("send", (c) => {
                c
                    .argument("<package>", "The file or directory to upload. If directory, it will be packed and sent.")
                    .option("--name <name>", "Allows to name sequence")
                    .desc("Send the Sequence package to the Store")
                    .completer({ package: "filenames" })
                    .action(async (sequencePackage: string, options: Record<string, unknown>) => {
                        const name = options.name as string;
                        const spaceId = sessionConfig.lastSpaceId;
                        const managerClient = getMiddlewareClient().getManagerClient(spaceId);
                        const uploadedItem = await managerClient.putStoreItem(
                            await getReadStreamFromFile(sequencePackage), name
                        );

                        displayObject(uploadedItem, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("delete", (c) => {
                c
                    .alias("rm")
                    .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
                    .desc("Delete the Sequence from the Store")
                    .action(async (id: string) => {
                        const spaceId = sessionConfig.lastSpaceId;
                        const managerClient = getMiddlewareClient().getManagerClient(spaceId);

                        displayObject(await managerClient.deleteStoreItem(id), profileManager.getProfileConfig().format);
                    });
            }),
            cmd("prune", (c) => {
                c
                    .desc("Remove all Sequences from the store (use with caution)")
                    .action(async () => {
                        const spaceId = sessionConfig.lastSpaceId;
                        const managerClient = getMiddlewareClient().getManagerClient(spaceId);

                        try {
                            await managerClient.clearStore();
                        } catch (e: any) {
                            throw new Error("Some Sequences may have not been deleted.");
                        }

                        displayMessage("Sequences removed successfully.");
                    });
            })
        );
});
