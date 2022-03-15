/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { setConfigValue } from "../config";
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
        .description("operations on grouped and separated runtime environments that allow sharing the data within them");

    spaceCmd.command("create")
        .description("Not implemented. Create the space/workspace if name not provided will be generated")
        .action(() => {
            throw new Error("Not implemented");
        });

    spaceCmd.command("list")
        .alias("ls")
        .description("List all existing spaces")
        .action(async () => {
            const mwClient = getMiddlewareClient(program);
            const mmList = await mwClient.listMultiManagers();

            if (!mmList.length) {
                console.error("No MultiManagers found");
                return;
            }

            // @TODO: get from all MultiManger.
            const multiManager = mmList[0];
            const multiManagerClient = mwClient.getMultiManagerClient(multiManager.id);

            const managers = await multiManagerClient.getManagers();

            console.log(managers);
        });

    spaceCmd.command("use")
        .argument("<id>")
        .description("Use the space")
        .action(async (id: string) => {
            const mwClient = getMiddlewareClient(program);
            const mmList = await mwClient.listMultiManagers();
            const multiManager = mmList[0];
            const multiManagerClient = mwClient.getMultiManagerClient(multiManager.id);
            const managerClient = multiManagerClient.getManagerClient(id);

            console.log({ id, ...await managerClient.getVersion() });
            setConfigValue("lastSpaceId", id);
        });
};
