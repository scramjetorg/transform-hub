/* eslint-disable no-console */
import { CommandDefinition } from "../../types";
import { getHostClient, getReadStreamFromFile } from "../common";
import { profileManager } from "../config";
import { displayEntity, displayStream } from "../output";
import { Option, Argument } from "commander";
import { initPlatform } from "../platform";
import {
    CommandCompleterDetails,
    CompleterDetailsEvent,
} from "../../events/completerDetails";

const validateTopicName = (topicName: string) => {
    if (topicName.match(/^[\\a-zA-Z0-9_+-]+$/)) {
        return topicName;
    }

    throw new Error("Invalid topic name");
};

/**
 * Initializes `topic` command.
 *
 * @param {Command} program Commander object.
 */
export const topic: CommandDefinition = (program) => {
    const format = profileManager.getProfileConfig().format;
    const topicNameArgument = new Argument("<topic-name>").argParser(
        validateTopicName
    );
    const contentTypeOption = new Option(
        "-t, --content-type [content-type]",
        "Specifies type of data in topic"
    )
        .choices([
            "text/x-ndjson",
            "application/x-ndjson",
            "text/plain",
            "application/octet-stream",
        ])
        .default("application/x-ndjson");

    const topicCmd = program
        .command("topic")
        .hook("preAction", initPlatform)
        .addHelpCommand(false)
        .configureHelp({ showGlobalOptions: true })
        .usage("[command] [options...]")
        .description("Manage data flow through topics operations");

    topicCmd
        .command("create")
        .addArgument(topicNameArgument)
        .addOption(contentTypeOption)
        .description("Create topic")
        .action(async (topicName, { contentType }) =>
            displayEntity(
                getHostClient().createTopic(topicName, contentType),
                format
            )
        );

    topicCmd
        .command("delete")
        .alias("rm")
        .addArgument(topicNameArgument)
        .description("Delete topic")
        .action(async (topicName) =>
            displayEntity(getHostClient().deleteTopic(topicName), format)
        );

    topicCmd
        .command("get")
        .addArgument(topicNameArgument)
        .addOption(contentTypeOption)
        .description("Get data from topic")
        .action(async (topicName, { contentType }) =>
            displayStream(
                getHostClient().getNamedData(topicName, {}, contentType)
            )
        );

    topicCmd
        .command("send")
        .addArgument(topicNameArgument)
        .argument("[file]")
        .addOption(contentTypeOption)
        .description(
            "Send data on topic from file, directory or directly through the console"
        )
        .on(CompleterDetailsEvent, (complDetails: CommandCompleterDetails) => {
            complDetails.file = "filenames";
        })
        .action(async (topicName, filename, { contentType }) => {
            await getHostClient().sendTopic(
                topicName,
                filename
                    ? await getReadStreamFromFile(filename)
                    : process.stdin,
                {},
                contentType
            );
        });

    topicCmd
        .command("list")
        .alias("ls")
        .description("List information about topics")
        .action(async () => displayEntity(getHostClient().getTopics(), format));
};
