/* eslint-disable no-console */
import { cmd, type CommandDescriptor } from "@scramjet/config";
import { instanceKill, instanceRestart } from "../helpers/instance";
import { attachStdio, getHostClient, getInstance, getReadStreamFromFile } from "../common";
import { getInstanceId, profileManager, sessionConfig } from "../config";
import { displayEntity, displayObject, displayStream } from "../output";
import { ClientError } from "@scramjet/client-utils";

/**
 * Builds the `instance` command descriptor tree.
 */
export const instanceCommand: CommandDescriptor = cmd("instance", (b) => {
    b
        .alias("inst")
        .usage("[command] [options...]")
        .desc("Operations on the running Sequence")
        .children(
            cmd("list", (c) => {
                c
                    .alias("ls")
                    .desc("List all Instances")
                    .action(async () => displayEntity(getHostClient().listInstances(), profileManager.getProfileConfig().format));
            }),
            cmd("use", (c) => {
                c
                    .argument("<id>", "Instance id")
                    .desc("Select the Instance to communicate with by using '-' alias instead of Instance id")
                    .action(async (id: string) => {
                        try {
                            await getHostClient().getInstanceInfo(id);
                        } catch (error) {
                            if (error instanceof ClientError && error.code === "NOT_FOUND") {
                                error.message = `Unable to find instance ${id}`;
                            }
                            throw error;
                        }

                        sessionConfig.setLastInstanceId(id);
                    });
            }),
            cmd("info", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Display a basic information about the Instance")
                    .action(async (id: string) => displayEntity(getHostClient().getInstanceInfo(getInstanceId(id)),
                        profileManager.getProfileConfig().format));
            }),
            cmd("health", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started")
                    .desc("Display Instance health status")
                    .action((id: string) => displayEntity(getInstance(getInstanceId(id)).getHealth(),
                        profileManager.getProfileConfig().format));
            }),
            cmd("log", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Pipe the running Instance log to stdout")
                    .action((id: string) => {
                        return displayStream(getInstance(getInstanceId(id)).getLogStream());
                    });
            }),
            cmd("kill", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started")
                    .option("--removeImmediately", "Remove instance from all flows right after kill")
                    .desc("Kill the Instance without waiting for the unfinished task")
                    .action(async (id: string, options: Record<string, unknown>) => {
                        const removeImmediately = options.removeImmediately as boolean || false;
                        const instanceKillResponse = await instanceKill(id, removeImmediately);

                        displayObject(instanceKillResponse, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("stop", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started")
                    .argument("<timeout>", "Timeout in milliseconds")
                    .desc("End the Instance gracefully waiting for the unfinished tasks")
                    .action(async (id: string, timeout: string) =>
                        displayEntity(getInstance(getInstanceId(id)).stop(+timeout, true),
                            profileManager.getProfileConfig().format));
            }),
            cmd("restart", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Kills the instance and start the new one from root sequence")
                    .action(async (id: string) => {
                        const instanceId = await getInstanceId(id);
                        const instanceRestartResponse = await instanceRestart(instanceId);

                        displayObject(instanceRestartResponse, profileManager.getProfileConfig().format);

                        sessionConfig.setLastInstanceId(instanceId);
                    });
            }),
            cmd("input", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .argument("[file]", "File with data")
                    .option("-t, --content-type <value>", "Content-Type")
                    .option("-e, --end", "Close the input stream of the Instance when this stream ends, \"x-end-stream\" header")
                    .desc("Send a file to input, if no file given the data will be read directly from the console input (stdin)")
                    .completer({ file: "filenames" })
                    .action(async (id: string, filename: string, options: Record<string, unknown>) => {
                        const contentType = options.contentType as string || "text/plain";
                        const end = options.end as boolean || false;
                        const instanceClient = getInstance(getInstanceId(id));

                        await instanceClient.sendInput(filename ? await getReadStreamFromFile(filename) : process.stdin, {},
                            { type: contentType, end });
                    });
            }),
            cmd("inout", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .argument("[file]", "File with data")
                    .option("-t, --content-type <content-type>", "Content-Type")
                    .option("-e, --end", "Close the input stream of the Instance when this stream ends, \"x-end-stream\" header")
                    .completer({ file: "filenames" })
                    .desc("See input and output")
                    .action(async (id: string, filename: string, options: Record<string, unknown>) => {
                        const contentType = options.contentType as string || "text/plain";
                        const end = options.end as boolean || false;
                        const instanceClient = getInstance(getInstanceId(id));

                        return displayStream(
                            await instanceClient.inout(
                                filename ? await getReadStreamFromFile(filename) : process.stdin, {
                                    headers: { "content-type": contentType },
                                },
                                { type: contentType, end }
                            )
                        );
                    });
            }),
            cmd("output", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Pipe the running Instance output to stdout")
                    .action((id: string) => {
                        return displayStream(getInstance(getInstanceId(id)).getStream("output"));
                    });
            }),
            cmd("stdio", (c) => {
                c
                    .alias("attach")
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Listen to all stdio - stdin, stdout, stderr of the running Instance")
                    .action(async (id: string) => {
                        const inst = getInstance(getInstanceId(id));

                        await attachStdio(inst);
                    });
            }),
            cmd("event", (eventCmd) => {
                eventCmd
                    .desc("Show event commands")
                    .children(
                        cmd("emit", (c) => {
                            c
                                .alias("invoke")
                                .argument("<id>", "Instance id or '-' for the last one started or selected")
                                .argument("<eventName>", "The event name")
                                .argument("[payload]", "Pass a JSON data to the Instance")
                                .desc("Send event with eventName and a JSON formatted event payload")
                                .action(async (id: string, eventName: string, message: string) => {
                                    const instanceClient = getInstance(getInstanceId(id));

                                    return displayEntity(instanceClient.sendEvent(eventName, message),
                                        profileManager.getProfileConfig().format);
                                });
                        }),
                        cmd("on", (c) => {
                            c
                                .argument("<id>", "The instance id or '-' for the last one started or selected")
                                .argument("<eventName>", "The event name")
                                .option("-n, --next", "Wait for the next event occurrence")
                                .option("-s, --stream", "Stream the events (the stream will start with last event)")
                                .desc("Get the last event occurrence (will wait for the first one if not yet retrieved)")
                                .action(async (id: string, event: string, options: Record<string, unknown>) => {
                                    const next = options.next as boolean;
                                    const stream = options.stream as boolean;

                                    if (stream) return displayStream(getInstance(getInstanceId(id)).getEventStream(event));
                                    if (next) return displayEntity(getInstance(getInstanceId(id)).getNextEvent(event),
                                        "json");
                                    return displayEntity(
                                        getInstance(getInstanceId(id)).getEvent(event), "json"
                                    );
                                });
                        })
                    );
            }),
            cmd("stdin", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .argument("[file]", "The input file (stdin if not given default)")
                    .desc("Send a file to stdin, if no file given the data will be read from stdin")
                    .completer({ file: "filenames" })
                    .action(async (id: string, file: string) => {
                        const instanceClient = getInstance(getInstanceId(id));

                        return displayEntity(instanceClient.sendStdin(file ? await getReadStreamFromFile(file) : process.stdin),
                            profileManager.getProfileConfig().format);
                    });
            }),
            cmd("stderr", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Pipe the running Instance stderr stream to stdout")
                    .action((id: string) => displayStream(getInstance(getInstanceId(id)).getStream("stderr")));
            }),
            cmd("stdout", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Pipe the running Instance stdout stream to stdout")
                    .action((id: string) => {
                        return displayStream(getInstance(getInstanceId(id)).getStream("stdout"));
                    });
            })
        );
});
