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
    //TODO: add commands version, log,
    const hubCmd = program
        .command("hub")
        .usage("si hub [subcommand] [options...]")
        .option(
            "-v, --version [name|id]",
            "display chosen hub version if a name is not provided it displays a version of a current hub"
        )
        .option("--driver", "", "scp")
        .option("--provider <value>", "specify provider: aws|cpm")
        .option("--region <value>", "i.e.: us-east-1")
        .description("allows to run programs in different data centers, computers or devices in local network");

    //TODO: remove after option -v implementation
    // hostCmd
    // .command("version")
    // .description("get version")
    // .action(async () => displayEntity(program, getHostClient(program).getVersion()));

    hubCmd
        .command("create")
        .argument("<name>")
        .option("--json <json>")
        .option("--file <pathToFile>")
        .description(" create hub with parameters")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    hubCmd
        .command("use")
        .argument("<name|id>")
        .description("specify the Hub you want to work with, all subsequent requests will be sent to this Hub")
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

    hubCmd
        .command("list")
        .alias("ls")
        .description("list all hubs")
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
        .command("load")
        .description("monitor CPU, memory and disk usage on the Hub")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    hubCmd
        .command("logs")
        .description("display the logs of the Hub")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    // TODO: think about it
    // hubCmd
    //     .command("set")
    //     .argument("<apiUrl>")
    //     .description("")
    //     .action(() => {
    //         // TODO: implement me
    //         throw new Error("Implement me");
    //     });
};
