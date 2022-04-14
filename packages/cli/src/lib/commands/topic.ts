import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
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
        .addHelpCommand(false)
        .usage("[command] [options...]")
        .description("publish/subscribe operations allows to manage data flow");

    if (isDevelopment())
        topicCmd
            .command("create")
            .argument("<topic-name>")
            .description("create topic")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    topicCmd
        .command("get")
        .argument("<topic-name>")
        .option(
            "-t, --content-type <content-type>",
            "specifies data type of <topic-name> (default: application/x-ndjson)"
        )
        .description("get data from topic")
        .action(async (topicName) => displayStream(getHostClient().getNamedData(topicName)));

    if (isDevelopment())
        topicCmd
            .command("delete")
            .alias("rm")
            .argument("<topic-name>")
            .description("delete data from topic")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    topicCmd
        .command("send")
        .argument("<topic-name>")
        .argument("[<file>]")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .description("send data on topic from file, directory or directly through the console")
        .action(async (topicName, filename, { contentType }) => {
            await getHostClient().sendNamedData(
                topicName,
                filename ? await getReadStreamFromFile(filename) : process.stdin,
                contentType
            );
        });

    topicCmd.command("ls")
        .description("List information about topics")
        .action(async () => displayEntity(getHostClient().getTopics()));
};
