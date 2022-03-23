/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { sessionConfig } from "../config";
import { getMiddlewareClient } from "../platform";

/**
 * Initializes `space` command.
 *
 * @param {Command} program Commander object.
 */
export const space: CommandDefinition = (program) => {
    const spaceCmd = program
        .command("space")
        .alias("spc")
        .usage("si space [subcommand] [options...]")
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname")
        //FIXME: can't set single -
        // .option("-", "minus sign holds the last used name|id")
        .description("operations on grouped and separated runtime environments that allow sharing the data within them")
        // FIXME: which description should we leave?
        // .description("Space is grouped and separated runtime environments that allow sharing the data within them.");

    spaceCmd
        .command("create")
        .argument("<name>")
        .description("create the space/workspace if name not provided will be generated")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    spaceCmd
        .command("list")
        .alias("ls")
        .description("List all existing spaces")
        .action(async () => {
            const mwClient = getMiddlewareClient(program);
            const mmList = await mwClient.listMultiManagers();

            if (!mmList.length) {
                console.error("No MultiManagers found");
                return;
            }

            // TODO: get from all MultiManger.
            const multiManager = mmList[0];
            const multiManagerClient = mwClient.getMultiManagerClient(multiManager.id);

            const managers = await multiManagerClient.getManagers();

            console.log(managers);
        });

    spaceCmd
        .command("use")
        .argument("<name>")
        .description("Use the space")
        .action(async (name: string) => {
            const mwClient = getMiddlewareClient(program);
            const mmList = await mwClient.listMultiManagers();
            const multiManager = mmList[0];
            const multiManagerClient = mwClient.getMultiManagerClient(multiManager.id);
            const managerClient = multiManagerClient.getManagerClient(name);

            console.log({ id: name, ...(await managerClient.getVersion()) });
            sessionConfig.setLastSpaceId(name);
        });

    spaceCmd
        .command("delete")
        .alias("rm")
        .argument("<name|id>")
        //FIXME: sound more like info than description?
        .description("user can only delete empty space")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    spaceCmd
        .command("update")
        .alias("up")
        .argument("<name|id>")
        //FIXME: error in description? description doesn't say anything...
        .description("up project info like alias")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });
};
