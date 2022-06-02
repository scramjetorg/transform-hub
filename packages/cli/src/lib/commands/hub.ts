/* eslint-disable no-console */
import { CommandDefinition, isProductionEnv } from "../../types";
import { isDevelopment } from "../../utils/envs";
import { getHostClient } from "../common";
import { profileConfig, sessionConfig } from "../config";
import { displayEntity, displayObject, displayStream } from "../output";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `hub` command.
 *
 * @param {Command} program Commander object.
 */
export const hub: CommandDefinition = (program) => {
    const { env, format } = profileConfig.getConfig();
    const isProductionEnviroment = isProductionEnv(env);

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

    if (isDevelopment() && isProductionEnviroment) {
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
    }

    if (isProductionEnviroment) {
        hubCmd
            .command("use")
            .argument("<name|id>")
            .description("Specify the default Hub you want to work with, all subsequent requests will be sent to this Hub")
            .action(async (id: string) => {
                const space = sessionConfig.getConfig().lastSpaceId;
                const managerClient = getMiddlewareClient().getManagerClient(space);
                const hosts = await managerClient.getHosts();
                const host = hosts.find((h: any) => h.id === id);

                if (!host) {
                    console.error("Host not found");
                    return;
                }
                managerClient.getHostClient(id);
                sessionConfig.setLastHubId(id);
            });
    }

    if (isProductionEnviroment) {
        hubCmd
            .command("list")
            .alias("ls")
            .description("List all the Hubs in the default space")
            .action(async () => {
                const space = sessionConfig.getConfig().lastSpaceId;

                if (!space) {
                    console.error("No space selected");
                    return;
                }

                const managerClient = getMiddlewareClient().getManagerClient(space);
                const hosts = await managerClient.getHosts();

                displayObject(hosts, format);
            });
    }

    if (isProductionEnviroment) {
        hubCmd
            .command("info")
        /* TODO for future use
        .argument("[name|id]")
        .description("display chosen hub version if a name is not provided it displays a version of a current hub")
        */
            .description("Display info about the default Hub")
            .action(async () => {
                const { lastSpaceId: space, lastHubId: id } = sessionConfig.getConfig();
                const managerClient = getMiddlewareClient().getManagerClient(space);
                const hosts = await managerClient.getHosts();
                const host = hosts.find((h: any) => h.id === id);

                displayObject(host, format);
            });
    }

    hubCmd
        .command("logs")
        .description("Pipe running Hub log to stdout")
        .action(async () => displayStream(getHostClient().getLogStream()));

    hubCmd
        .command("load")
        .description("Monitor CPU, memory and disk usage on the Hub")
        .action(async () => displayEntity(getHostClient().getLoadCheck(), format));

    hubCmd
        .command("version")
        .description("Display version of the default Hub")
        .action(async () => displayEntity(getHostClient().getVersion(), format));
};
