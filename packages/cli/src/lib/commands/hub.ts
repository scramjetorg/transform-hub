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
        .usage("si hub [subcommand] [options...]")
        //FIXME: diff with draft returns:
        // --driver                   (default: "scp")
        .option("--driver", "", "scp")
        .option("--provider <aws|cpm>")
        .option("--region <us-east-1|...>")
        .description("allows to run programs in different data centers, computers or devices in local network");
    // FIXME: which description should we leave?
    // .description("Hub allows to run programs in different data centers, computers or devices in local network.");

    // hubCmd
    //     //FIXME: missing name in draft
    //     .command()
    //     .argument("[name]")
    //     .option("-v")
    //     .action(() => {
    //         // TODO: implement me
    //         throw new Error("Implement me");
    //     });

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

    hubCmd
        .command("create")
        .argument("<options...>")
        .description(" create hub with parameters")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    hubCmd
        // FIXME: probably should be merged with previous one
        .command("create")
        // FIXME: differs from draft
        .argument("<pathToFile>")
        .description("create hub with parameters from JSON file")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    hubCmd
        .command("set")
        .argument("<apiUrl>")
        // FIXME: lacking description in draft
        .description("")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });
};
