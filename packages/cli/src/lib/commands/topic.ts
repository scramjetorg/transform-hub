import { CommandDefinition } from "../../types";
import { getHostClient, getReadStreamFromFile } from "../common";
import { displayEntity, displayStream } from "../output";

export const topic: CommandDefinition = (program) => {
    const topicCmd = program
        .command("topic [command]")
        .description("operations on topic");

    topicCmd.command("send <topic> [<file>]")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .option("-e, --end", "x-end-stream", false)
        .description("send data to topic")
        .action(async (topicName, filename, { contentType, end }) => displayEntity(
            program,
            getHostClient(program).sendNamedData(
                topicName,
                await getReadStreamFromFile(filename) || process.stdin,
                contentType,
                end)
        ));

    topicCmd.command("get <topic>")
        .description("get data from topic")
        .action(async (topicName) => displayStream(program, getHostClient(program).getNamedData(topicName)));
};
