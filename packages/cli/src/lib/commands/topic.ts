import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { getHostClient } from "../common";
import { displayEntity, displayStream } from "../output";

export const topic: CommandDefinition = (program) => {
    const topicCmd = program
        .command("topic [command]")
        .description("operations on topic");

    topicCmd.command("send <topic> [<file>]")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .description("send data to topic")
        .action(async (topicName, stream, { contentType }) => displayEntity(
            program,
            getHostClient(program).sendNamedData(
                topicName,
                stream ? createReadStream(stream) : process.stdin,
                contentType
            )
        ));

    topicCmd.command("get <topic>")
        .description("get data from topic")
        .action(async (topicName) => displayStream(program, getHostClient(program).getNamedData(topicName)));
};
