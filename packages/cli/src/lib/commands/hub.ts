import { cmd, type CommandDescriptor } from "@scramjet/config";
import { MRestAPI } from "@scramjet/api-types";
import { isProductionEnv } from "../../types";
import { getHostClient } from "../common";
import { profileManager, sessionConfig } from "../config";
import { getMiddlewareClient } from "../platform";
import { displayEntity, displayObject, displayStream } from "../output";
import { getInfo } from "../helpers/various";

function buildProdChildren(): CommandDescriptor[] {
    const mwClient = getMiddlewareClient();

    return [
        cmd("use", (c) => {
            c
                .argument("<name|id>")
                .desc("Specify the default Hub you want to work with, all subsequent requests will be sent to this Hub")
                .action(async (id: string) => {
                    const space = sessionConfig.lastSpaceId;
                    const managerClient = getMiddlewareClient().getManagerClient(space);
                    const hosts = await managerClient.getHosts();
                    const host = hosts.find((h: any) => h.id === id);

                    if (!host) {
                        throw new Error("Host not found");
                    }
                    managerClient.getHostClient(id);
                    sessionConfig.setLastHubId(id);
                });
        }),
        cmd("list", (c) => {
            c
                .alias("ls")
                .desc("List all the Hubs in the default space")
                .action(async () => {
                    const space = sessionConfig.lastSpaceId;

                    if (!space) {
                        throw new Error("No space selected");
                    }

                    const managerClient = getMiddlewareClient().getManagerClient(space);
                    const hosts = await managerClient.getHosts();

                    displayObject(hosts, profileManager.getProfileConfig().format);
                });
        }),
        cmd("info", (c) => {
            c
                .desc("Display info about the default Hub")
                .action(async () => {
                    displayObject((await getInfo()).host, profileManager.getProfileConfig().format);
                });
        }),
        cmd("disconnect", (c) => {
            c
                .desc("Disconnect self hosted Hubs from space")
                .argument("<space_name>", "The name of the Space")
                .option("--id <id>", "Hub Id")
                .option("--all", "Disconnects all self-hosted Hubs connected to Space")
                .action(async (spaceName: string, options: Record<string, unknown>) => {
                    const id = options.id as string;
                    const all = options.all as boolean;
                    const managerClient = mwClient.getManagerClient(spaceName);
                    let opts = {} as MRestAPI.PostDisconnectPayload;

                    if (typeof id === "string") {
                        opts = { id };
                    }

                    if (all) {
                        opts = { limit: 0 };
                    }
                    if (!Object.keys(opts).length) {
                        throw new Error("Missing --id or --all");
                    }

                    displayObject(await managerClient.disconnectHubs(opts), profileManager.getProfileConfig().format);
                });
        }),
        cmd("delete", (c) => {
            c
                .alias("rm")
                .desc("Delete self hosted Hub from space")
                .argument("<id>", "Hub Id")
                .option("-f, --force", "Enable deleting Hubs that are not disconnected")
                .action(async (id: string, options: Record<string, unknown>) => {
                    const force = options.force as boolean;
                    const spaceName = sessionConfig.lastSpaceId;
                    const managerClient = mwClient.getManagerClient(spaceName);

                    let result;

                    try {
                        result = await managerClient.deleteHub(id, force);
                    } catch (e: any) {
                        if (e.body) {
                            console.error(e.message);
                            throw Error(JSON.parse(e.body).error);
                        }

                        throw e;
                    }

                    displayObject(result, profileManager.getProfileConfig().format);
                });
        })
    ];
}

function buildCommonChildren(): CommandDescriptor[] {
    return [
        cmd("logs", (c) => {
            c
                .desc("Pipe running Hub log to stdout")
                .action(async () => displayStream(getHostClient().getLogStream()));
        }),
        cmd("audit", (c) => {
            c
                .desc("Pipe running Hub audit information to stdout")
                .action(async () => displayStream(getHostClient().getAuditStream()));
        }),
        cmd("load", (c) => {
            c
                .desc("Monitor CPU, memory and disk usage on the Hub")
                .action(async () => displayEntity(getHostClient().getLoadCheck(), profileManager.getProfileConfig().format));
        }),
        cmd("version", (c) => {
            c
                .desc("Display version of the default Hub")
                .action(async () => displayEntity(getHostClient().getVersion(), profileManager.getProfileConfig().format));
        })
    ];
}

/**
 * Builds the `hub` command descriptor tree.
 */
export const hubCommand: CommandDescriptor = cmd("hub", (b) => {
    const profileConfig = profileManager.getProfileConfig();
    const isProdEnv = isProductionEnv(profileConfig.env);

    b
        .usage("[command] [options...]")
        .desc("Allows to run programs in different data centers, computers or devices in local network");

    if (isProdEnv) {
        b.children(...buildProdChildren(), ...buildCommonChildren());
    } else {
        b.children(...buildCommonChildren());
    }
});
