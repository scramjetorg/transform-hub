/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/envs";
import { getHostClient, getReadStreamFromFile } from "../common";
import { profileConfig } from "../config";
import { displayEntity, displayStream } from "../output";

const validateTopicName = (topicName: string) => {
    if (topicName.match(/^[a-zA-Z0-9_-]*$/)) {
        return;
    }

    throw new Error("Invalid topic name");
};

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
        .description("Manage data flow through topics operations");

    if (isDevelopment()) {
        topicCmd
            .command("create")
            .argument("<topic-name>")
            .description("TO BE IMPLEMENTED / Create topic")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });
    }

    topicCmd
        .command("get")
        .argument("<topic-name>")
        .option(
            "-t, --content-type <content-type>",
            "Specifies data type of <topic-name> (default: application/x-ndjson)"
        )
        .description("Get data from topic")
        .hook("preAction", (command) => { validateTopicName(command.args[0]); })
        .action(async (topicName) => displayStream(getHostClient().getNamedData(topicName)));

    if (isDevelopment()) {
        topicCmd
            .command("delete")
            .alias("rm")
            .argument("<topic-name>")
            .description("TO BE IMPLEMENTED / Delete data from topic")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });
    }

    topicCmd
        .command("send")
        .argument("<topic-name>")
        .argument("[<file>]")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .description("Send data on topic from file, directory or directly through the console")
        .hook("preAction", (command) => { validateTopicName(command.args[0]); })
        .action(async (topicName, filename, { contentType }) => {
            await getHostClient().sendNamedData(
                topicName,
                filename ? await getReadStreamFromFile(filename) : process.stdin,
                {},
                contentType
            );
        });

    topicCmd.command("ls")
        .description("List information about topics")
        .action(async () => displayEntity(getHostClient().getTopics(), profileConfig.format));
};
