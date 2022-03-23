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
        .command("topic")
        .usage("si topic [subcommand] [options...]")
        // FIXME: previous: operations on topic
        .description("publish/subscribe operations allows to manage data flow");
    // FIXME: which description should we leave?
    // .description("Topic allows to manage data flow by publish–subscribe (pub/sub) messaging operations.");

    topicCmd
        .command("create")
        .argument("<topic-name>")
        .description("create topic")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    topicCmd
        .command("get")
        .argument("<topic-name>")
        .option(
            "-t, --content-type <content-type>",
            "specifies data type of <topic-name> (default: application/x-ndjson)"
        )
        .option("-e, --end <boolean>", "close topic stream after processing the request, x-end-stream (default: false)")
        .description("get data from topic")
        .action(async (topicName) => displayStream(program, getHostClient(program).getNamedData(topicName)));

    topicCmd
        .command("delete")
        //FIXME: alias rm like in previous delete commands?
        .argument("<topic-name>")
        .description("delete data from topic")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    topicCmd
        .command("send")
        .argument("<topic-name>")
        .argument("[<file>]")
        // FIXME: not in draft, should stay?
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        // FIXME: not in draft, should stay?
        .option("-e, --end", "x-end-stream", false)
        .description("send data on topic from file, directory or directly through the console")
        .action(async (topicName, filename, { contentType, end }) =>
            displayEntity(
                program,
                getHostClient(program).sendNamedData(
                    topicName,
                    filename ? await getReadStreamFromFile(filename) : process.stdin,
                    contentType,
                    end
                )
            )
        );
};
