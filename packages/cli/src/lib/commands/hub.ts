/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { getHostClient } from "../common";
import { globalConfig, sessionConfig } from "../config";
import { displayEntity, displayObject, displayStream } from "../output";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `hub` command.
 *
 * @param {Command} program Commander object.
 */
export const hub: CommandDefinition = (program) => {
    const isProductionEnv = globalConfig.isProductionEnv(globalConfig.getEnv());

    const hubCmd = program
        .command("hub")
        .addHelpCommand(false)
        .usage("[command] [options...]")
        /* TODO: for future implementation
            .option("--driver", "", "scp")
            .option("--provider <value>", "specify provider: aws|cpm")
            .option("--region <value>", "i.e.: us-east-1")
    */
        .description("Allows to run programs in different data centers, computers or devices in local network");

    if (isDevelopment() && isProductionEnv)
        hubCmd
            .command("create")
            .argument("<name>")
            .option("--json <json>")
            .option("--file <pathToFile>")
            .description("TO BE IMPLEMENTED / Create a Hub with parameters")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    hubCmd
        .command("use")
        .argument("<name|id>")
        .description("Specify the Hub you want to work with, all subsequent requests will be sent to this Hub")
        .action(async (id: string) => {
            const space = sessionConfig.getConfig().lastSpaceId;

            console.log("Space:", space);
            const managerClient = getMiddlewareClient().getManagerClient(space);

            const hosts = await managerClient.getHosts();

            const host = hosts.find((h: any) => h.id === id);

            if (!host) {
                console.error("Host not found");
                return;
            }

            const hostClient = managerClient.getHostClient(id);

            sessionConfig.setLastHubId(id);
            displayObject(hostClient);
        });

    hubCmd
        .command("list")
        .alias("ls")
        .description("List the Hubs")
        .action(async () => {
            const space = sessionConfig.getConfig().lastSpaceId;

            if (!space) {
                console.error("No space selected");
                return;
            }

            const managerClient = getMiddlewareClient().getManagerClient(space);
            const hosts = await managerClient.getHosts();

            console.log("Hubs", hosts);
        });

    hubCmd
        .command("info")
        /* TODO for future use
        .argument("[name|id]")
        .description("display chosen hub version if a name is not provided it displays a version of a current hub")
         */
        .description("Display info about the Hub")
        .action(async () => displayEntity(getHostClient().getVersion()));

    hubCmd
        .command("logs")
        .description("Pipe running Hub log to stdout")
        .action(async () => displayStream(getHostClient().getLogStream()));

    hubCmd
        .command("load")
        .description("Monitor CPU, memory and disk usage on the Hub")
        .action(async () => displayEntity(getHostClient().getLoadCheck()));
};
