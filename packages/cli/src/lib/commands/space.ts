import { cmd, type CommandDescriptor } from "@scramjet/config";
import { isProductionEnv } from "../../types";
import { profileManager, sessionConfig } from "../config";
import { displayObject, displayStream } from "../output";
import { getMiddlewareClient } from "../platform";
import { displayProdOnlyMsg } from "../helpers/messages";
/**
 * Builds the `space` command descriptor tree.
 */
export const spaceCommand: CommandDescriptor = cmd("space", (b) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv) {
        b.hidden(true).action(() => displayProdOnlyMsg("space"));
        return;
    }

    const mwClient = getMiddlewareClient();

    b
        .alias("spc")
        .usage("[command] [options...]")
        .option("-c, --stdout", "Output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .desc("Operations on grouped and separated runtime environments that allow sharing the data within them")
        .children(
            cmd("info", (c) => {
                c
                    .desc("Display info about the default space")
                    .action(async () => {
                        const spaceId = sessionConfig.lastSpaceId;
                        const managerClient = mwClient.getManagerClient(spaceId);
                        const version = await managerClient.getVersion();

                        displayObject({ spaceId, version, managerClient }, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("list", (c) => {
                c
                    .alias("ls")
                    .desc("List all existing spaces")
                    .action(async () => {
                        const managers = await mwClient.getManagers();

                        return displayObject(managers, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("use", (c) => {
                c
                    .argument("<name>")
                    .desc("Use the space")
                    .action(async (name: string) => {
                        const managerClient = mwClient.getManagerClient(name);

                        displayObject({ name, ...await managerClient.getVersion() }, profileManager.getProfileConfig().format);
                        sessionConfig.setLastSpaceId(name);
                    });
            }),
            cmd("audit", (c) => {
                c
                    .desc("Fetch all audit messages from spaces")
                    .action(async () => {
                        return displayStream(await mwClient.getAuditStream());
                    });
            }),
            cmd("logs", (c) => {
                c
                    .argument("[<space_name>]", "The name of the space (defaults to current space)")
                    .desc("Fetch all logs from space")
                    .action(async (spaceName: string) => {
                        if (typeof spaceName === "undefined") spaceName = sessionConfig.lastSpaceId;

                        const managerClient = mwClient.getManagerClient(spaceName);

                        await displayStream(await managerClient.getLogStream());
                    });
            }),
            cmd("version", (c) => {
                c
                    .desc("Display space version")
                    .action(async () => {
                        const spaceName = sessionConfig.lastSpaceId;
                        const managerClient = mwClient.getManagerClient(spaceName);
                        const version = await managerClient.getVersion();

                        displayObject(version, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("access", (c) => {
                c
                    .desc("Manages Access Keys for active Space")
                    .children(
                        cmd("create", (cc) => {
                            cc
                                .argument("<description>", "Key description")
                                .desc("Create Access key for adding Hubs to active Space, i.e \"Army of Darkness\"")
                                .action(async (description: string) => {
                                    const spaceName = sessionConfig.lastSpaceId;

                                    if (!spaceName) {
                                        throw new Error("No Space set");
                                    }

                                    const accessKey = await mwClient.createAccessKey(spaceName, { description });

                                    displayObject(accessKey, profileManager.getProfileConfig().format);
                                });
                        }),
                        cmd("list", (cc) => {
                            cc
                                .alias("ls")
                                .desc("List Access Keys metadata in active Space")
                                .action(async () => {
                                    const spaceName = sessionConfig.lastSpaceId;

                                    if (!spaceName) {
                                        throw new Error("No Space set");
                                    }

                                    displayObject(await mwClient.listAccessKeys(spaceName), profileManager.getProfileConfig().format);
                                });
                        }),
                        cmd("revoke", (cc) => {
                            cc
                                .desc("Revokes Access Key in active Space")
                                .option("--id <id>", "revoke specified key")
                                .option("--all", "Removes all access keys and disconnects all self-hosted Hubs connected to Space")
                                .action(async (options: Record<string, unknown>) => {
                                    const all = options.all as boolean;
                                    const id = options.id as string;
                                    const spaceName = sessionConfig.lastSpaceId;

                                    if (all && id || !all && !id) {
                                        throw new Error("Please provide one of the options, please use command with --help to get more information");
                                    }

                                    if (!spaceName) {
                                        throw new Error("No Space set");
                                    }

                                    if (id) {
                                        const revokedAccessKey = await mwClient.revokeAccessKey(spaceName, id);

                                        return displayObject(revokedAccessKey, profileManager.getProfileConfig().format);
                                    }

                                    const apiKeys = await mwClient.listAccessKeys(spaceName);

                                    if (!apiKeys.accessKeys || apiKeys.accessKeys.length === 0) {
                                        throw new Error("There are no keys to revoke");
                                    }

                                    const revokedAccessKeys = await mwClient.revokeAllAccessKeys(spaceName);

                                    return displayObject(revokedAccessKeys, profileManager.getProfileConfig().format);
                                });
                        })
                    );
            })
        );
});
