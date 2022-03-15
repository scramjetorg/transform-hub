/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { sessionConfig } from "../config";
import { displayObject } from "../output";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `hub` command.
 *
 * @param {Command} program Commander object.
 */
export const hub: CommandDefinition = (program) => {
    const hubCmd = program
        .command("hub")
        .description("allows to run programs in different data centers, computers or devices in local network");

    hubCmd
        .command("list")
        .alias("ls")
        .description("List all hubs")
        .action(async () => {
            const space = sessionConfig.getConfig().lastSpaceId;

            if (!space) {
                console.error("No space selected");
                return;
            }

            console.log("Space:", space);
            const managerClient = getMiddlewareClient(program).getManagerClient(space);

            const hosts = await managerClient.getHosts();

            console.log("Hubs", hosts);
        });

    hubCmd
        .command("use <id>")
        .description("Specify the Hub you want to work with, all subsequent requests will be sent to this Hub")
        .action(async (id: string) => {
            const space = sessionConfig.getConfig().lastSpaceId;

            console.log("Space:", space);
            const managerClient = getMiddlewareClient(program).getManagerClient(space);

            const hosts = await managerClient.getHosts();

            const host = hosts.find((h: any) => h.id === id);

            if (!host) {
                console.error("Host not found");
                return;
            }

            const hostClient = managerClient.getHostClient(id);

            sessionConfig.setLastHubId(id);
            await displayObject(program, hostClient);
        });
};
