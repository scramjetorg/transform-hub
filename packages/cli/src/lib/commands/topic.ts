import { CommandDefinition } from "../../types";
import { getHostClient, getReadStreamFromFile } from "../common";
import { displayEntity, displayStream } from "../output";

/**
 * Initializes `topic` command.
 *
 * @param {Command} program Commander object.
 */
export const topic: CommandDefinition = (program) => {
    const topicCmd = program
        .command("topic [command]")
        .description("operations on topic");

    topicCmd.command("send <topic> [<file>]")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .description("send data to topic")
        .action(async (topicName, filename, { contentType }) => displayEntity(
            program,
            getHostClient(program).sendNamedData(
                topicName,
                filename ? await getReadStreamFromFile(filename) : process.stdin,
                contentType,
                false)
        ));

    topicCmd.command("get <topic>")
        .description("get data from topic")
        .action(async (topicName) => displayStream(program, getHostClient(program).getNamedData(topicName)));
};
