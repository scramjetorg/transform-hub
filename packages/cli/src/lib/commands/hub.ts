/* eslint-disable no-console */
import { PostDisconnectPayload } from "@scramjet/types/src/rest-api-manager";
import { CommandDefinition, isProductionEnv } from "../../types";
import { getHostClient } from "../common";
import { profileManager, sessionConfig } from "../config";
import { getMiddlewareClient, initPlatform } from "../platform";
import { displayEntity, displayObject, displayStream } from "../output";
import { getInfo, setDefaultHub } from "../helpers/various";

/**
 * Initializes `hub` command.
 *
 * @param {Command} program Commander object.
 */
export const hub: CommandDefinition = (program) => {
    const profileConfig = profileManager.getProfileConfig();
    const isProdEnv = isProductionEnv(profileConfig.env);

    const hubCmd = program
        .command("hub")
        .hook("preAction", initPlatform)
        .addHelpCommand(false)
        .configureHelp({ showGlobalOptions: true })
        .usage("[command] [options...]")
        .description("Allows to run programs in different data centers, computers or devices in local network");

    if (isProdEnv) {
        const mwClient = getMiddlewareClient();

        hubCmd
            .command("use")
            .argument("<name|id>")
            .description("Specify the default Hub you want to work with, all subsequent requests will be sent to this Hub")
            .action(async (id: string) => {
                const space = sessionConfig.lastSpaceId;
                const managerClient = getMiddlewareClient().getManagerClient(space);
                const hosts = (await managerClient.getHosts()).data;
                const host = hosts.find((h: any) => h.id === id);

                if (!host) {
                    throw new Error("Host not found");
                }
                managerClient.getHostClient(id);
                sessionConfig.setLastHubId(id);
            });
        hubCmd
            .command("list")
            .alias("ls")
            .description("List all the Hubs in the default space")
            .action(async () => {
                const space = sessionConfig.lastSpaceId;

                if (!space) {
                    throw new Error("No space selected");
                }

                const managerClient = getMiddlewareClient().getManagerClient(space);
                const hosts = await managerClient.getHosts();

                displayObject(hosts, profileConfig.format);
            });
        hubCmd
            .command("info")
            .description("Display info about the default Hub")
            .action(async () => {
                displayObject((await getInfo()).host, profileConfig.format);
            });
        hubCmd
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

        hubCmd
            .command("delete")
            .alias("rm")
            .description("Delete self hosted Hub from space")
            .argument("<id>", "Hub Id")
            .option("-f, --force", "Enable deleting Hubs that are not disconnected", false)
            .hook("postAction", async () => {
                await setDefaultHub();
            })
            .action(async (id: string, { force } : { force: boolean }) => {
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
    }

    hubCmd
        .command("logs")
        .description("Pipe running Hub log to stdout")
        .action(async () => displayStream(getHostClient().getLogStream()));

    hubCmd
        .command("audit")
        .description("Pipe running Hub audit information to stdout")
        .action(async () => displayStream(getHostClient().getAuditStream()));

    hubCmd
        .command("load")
        .description("Monitor CPU, memory and disk usage on the Hub")
        .action(async () => displayEntity(getHostClient().getLoadCheck(), profileConfig.format));

    hubCmd
        .command("version")
        .description("Display version of the default Hub")
        .action(async () => displayEntity(getHostClient().getVersion(), profileConfig.format));
};
