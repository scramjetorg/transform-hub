import { cmd, type CommandDescriptor } from "@scramjet/config";
import { getHostClient, getReadStreamFromFile } from "../common";
import { profileManager } from "../config";
import { displayEntity, displayStream } from "../output";

/**
 * Builds the `topic` command descriptor tree.
 */
export const topicCommand: CommandDescriptor = cmd("topic", (b) => {
    const format = profileManager.getProfileConfig().format;

    b
        .usage("[command] [options...]")
        .desc("Manage data flow through topics operations")
        .children(
            cmd("create", (c) => {
                c
                    .argument("<topic-name>", undefined, true)
                    .option("-t, --content-type [content-type]", "Specifies type of data in topic")
                    .desc("Create topic")
                    .action(async (topicName: string, options: Record<string, unknown>) => {
                        const contentType = options.contentType as string || "application/x-ndjson";

                        await displayEntity(
                            getHostClient().createTopic(topicName, contentType),
                            format
                        );
                    });
            }),
            cmd("delete", (c) => {
                c
                    .alias("rm")
                    .argument("<topic-name>", undefined, true)
                    .desc("Delete topic")
                    .action(async (topicName: string) =>
                        displayEntity(getHostClient().deleteTopic(topicName), format)
                    );
            }),
            cmd("get", (c) => {
                c
                    .argument("<topic-name>", undefined, true)
                    .option("-t, --content-type [content-type]", "Specifies type of data in topic")
                    .desc("Get data from topic")
                    .action(async (topicName: string, options: Record<string, unknown>) => {
                        const contentType = options.contentType as string || "application/x-ndjson";

                        await displayStream(
                            getHostClient().getNamedData(topicName, {}, contentType)
                        );
                    });
            }),
            cmd("send", (c) => {
                c
                    .argument("<topic-name>", undefined, true)
                    .argument("[file]")
                    .option("-t, --content-type [content-type]", "Specifies type of data in topic")
                    .desc("Send data on topic from file, directory or directly through the console")
                    .completer({ file: "filenames" })
                    .action(async (topicName: string, filename: string, options: Record<string, unknown>) => {
                        const contentType = options.contentType as string || "application/x-ndjson";

                        await getHostClient().sendTopic(
                            topicName,
                            filename
                                ? await getReadStreamFromFile(filename)
                                : process.stdin,
                            {},
                            contentType
                        );
                    });
            }),
            cmd("list", (c) => {
                c
                    .alias("ls")
                    .desc("List information about topics")
                    .action(async () => displayEntity(getHostClient().getTopics(), format));
            })
        );
});
