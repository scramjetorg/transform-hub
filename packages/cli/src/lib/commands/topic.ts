import { cmd, type CommandDescriptor } from "@scramjet/config";
import { getHostClient, getReadStreamFromFile } from "../common";
import { profileManager, sessionConfig } from "../config";
import { getMiddlewareClient } from "../platform";
import { displayEntity, displayStream } from "../output";
import { getNativeCapabilities } from "../capabilities";

/**
 * Builds the `topic` command descriptor tree.
 */
export const topicCommand: CommandDescriptor = cmd("topic", (b) => {
    const format = profileManager.getProfileConfig().format;

    b.usage("[command] [options...]")
        .desc("Manage data flow through topics operations")
        .children(
            cmd("create", (c) => {
                c.argument("<topic-name>", undefined, true)
                    .option("-t, --content-type [content-type]", "Specifies type of data in topic")
                    .desc("Create topic")
                    .action(async (topicName: string, options: Record<string, unknown>) => {
                        const contentType = (options.contentType as string) || "application/x-ndjson";
                        const native = getNativeCapabilities();
                        await displayEntity(native ? native.json("POST", "/api/v2/topics", { topic: { name: topicName, contentType } }) : getHostClient().createTopicV2({ name: topicName, contentType }), format);
                    });
            }),
            cmd("delete", (c) => {
                c.alias("rm")
                    .argument("<topic-name>", undefined, true)
                    .desc("Delete topic")
                    .action(async (topicName: string) => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("DELETE", `/api/v2/topics/${encodeURIComponent(topicName)}`) : getHostClient().deleteTopicV2(topicName), format); });
            }),
            cmd("get", (c) => {
                c.argument("<topic-name>", undefined, true)
                    .option("--scope <scope>", "Topic scope: hub or space")
                    .option("-t, --content-type [content-type]", "Specifies type of data in topic")
                    .desc("Get data from topic")
                    .action(async (topicName: string, options: Record<string, unknown>) => {
                        const contentType = (options.contentType as string) || "application/x-ndjson";

                        const scope = (options.scope as string) || "hub";
                        if (scope !== "hub" && scope !== "space") throw new Error(`Invalid topic scope: ${scope}`);
                        const native = getNativeCapabilities();
                        if (native) await displayStream(native.stream(native.topicPath(scope as "hub" | "space", `/topics/${encodeURIComponent(topicName)}/stream`), scope === "space" ? "manager" : "hub"));
                        else { const client = scope === "hub" ? getHostClient() : getMiddlewareClient().getManagerClient(sessionConfig.lastSpaceId); await displayStream(client.getTopicV2(topicName, {}, contentType)); }
                    });
            }),
            cmd("send", (c) => {
                c.argument("<topic-name>", undefined, true)
                    .argument("[file]")
                    .option("--scope <scope>", "Topic scope: hub or space")
                    .option("-t, --content-type [content-type]", "Specifies type of data in topic")
                    .desc("Send data on topic from file, directory or directly through the console")
                    .completer({ file: "filenames" })
                    .action(async (topicName: string, filename: string, options: Record<string, unknown>) => {
                        const contentType = (options.contentType as string) || "application/x-ndjson";

                        const scope = (options.scope as string) || "hub";
                        if (scope !== "hub" && scope !== "space") throw new Error(`Invalid topic scope: ${scope}`);
                        const native = getNativeCapabilities();
                        if (native) await native.upload("POST", native.topicPath(scope as "hub" | "space", `/topics/${encodeURIComponent(topicName)}/stream`), filename ? await getReadStreamFromFile(filename) : process.stdin, contentType, {}, scope === "space" ? "manager" : "hub");
                        else { const client = scope === "hub" ? getHostClient() : getMiddlewareClient().getManagerClient(sessionConfig.lastSpaceId); await client.sendTopicV2(topicName, filename ? await getReadStreamFromFile(filename) : process.stdin, {}, contentType); }
                    });
            }),
            cmd("list", (c) => {
                c.alias("ls")
                    .option("--scope <scope>", "Topic scope: hub or space")
                    .desc("List information about topics")
                    .action(async (options: Record<string, unknown>) => {
                        const scope = (options.scope as string) || "hub";
                        if (scope !== "hub" && scope !== "space") throw new Error(`Invalid topic scope: ${scope}`);
                        const native = getNativeCapabilities();
                        if (native) displayEntity(await (scope === "space"
                            ? native.managerJson("GET", native.topicPath("space", "/topics"))
                            : native.json("GET", native.topicPath("hub", "/topics"))), format);
                        else { const client = scope === "hub" ? getHostClient() : getMiddlewareClient().getManagerClient(sessionConfig.lastSpaceId); displayEntity(await client.getTopicsV2(), format); }
                    });
            })
        );
});
