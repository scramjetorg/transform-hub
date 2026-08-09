import { cmd, type CommandDescriptor } from "@scramjet/config";
import { instanceKill, instanceRestart } from "../helpers/instance";
import { attachStdio, getHostClient, getInstance, getReadStreamFromFile } from "../common";
import { getInstanceId, profileManager, sessionConfig } from "../config";
import { displayEntity, displayLogStream, displayObject, displayStream } from "../output";
import { ClientError } from "@scramjet/client-utils";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { CapabilityUnavailableError, getNativeCapabilities } from "../capabilities";
import { configControlCommands } from "./configControls";

const instancePath = (id: string) => `/api/v2/instances/${encodeURIComponent(getInstanceId(id))}`;

async function attachNativeStdio(id: string) {
    const native = getNativeCapabilities()!;
    const path = instancePath(id);
    const descriptor = await native.json<{ channels?: Array<{ fd: number; readable: boolean; writable: boolean }> }>("GET", `${path}/stdio`);
    const channels = descriptor.channels || [];
    if (!channels.some(channel => channel.fd === 0 && channel.writable)
        || !channels.some(channel => channel.fd === 1 && channel.readable)
        || !channels.some(channel => channel.fd === 2 && channel.readable)) {
        throw new CapabilityUnavailableError("Instance stdio attach (the selected instance does not expose stdin, stdout, and stderr)");
    }
    type CleanableReadable = Readable & { cleanup?: () => Promise<void> };
    let stdout: CleanableReadable | undefined;
    let stderr: CleanableReadable | undefined;
    try {
        stdout = await native.stream(`${path}/stdio/1`) as CleanableReadable;
        stderr = await native.stream(`${path}/stdio/2`) as CleanableReadable;
    } catch (error) {
        stdout?.destroy(error as Error);
        stderr?.destroy(error as Error);
        await Promise.all([stdout?.cleanup?.(), stderr?.cleanup?.()]);
        throw error;
    }
    const pipes: Array<{ source: CleanableReadable; destination: NodeJS.WritableStream; onError: (error: Error) => void; onClose: () => void; onEnd: () => void }> = [];
    let closing: Promise<void> | undefined;
    const close = (error?: Error) => closing ||= (async () => {
        for (const { source, destination, onError, onClose, onEnd } of pipes) {
            source.removeListener("error", onError);
            source.removeListener("end", onEnd);
            destination.removeListener("close", onClose);
            source.unpipe(destination);
        }
        for (const stream of [stdout, stderr, process.stdin]) if (stream && !stream.destroyed) stream.destroy(error);
        await Promise.all([
            stdout && finished(stdout).catch(() => {}), stderr && finished(stderr).catch(() => {}),
            stdout?.cleanup?.(), stderr?.cleanup?.()
        ]);
    })();
    const pipe = (source: CleanableReadable, destination: NodeJS.WritableStream) => {
        const onError = (error: Error) => { void close(error); };
        const onClose = () => { if (!source.readableEnded) void close(); };
        const onEnd = () => destination.removeListener("close", onClose);
        pipes.push({ source, destination, onError, onClose, onEnd });
        source.once("error", onError);
        source.once("end", onEnd);
        destination.once("close", onClose);
        source.pipe(destination, { end: false });
        return finished(source);
    };
    try {
        await Promise.all([
            native.upload("PUT", `${path}/stdio/0`, process.stdin),
            pipe(stdout, process.stdout),
            pipe(stderr, process.stderr)
        ]);
    } catch (error) {
        await close(error as Error);
        throw error;
    } finally {
        await close();
    }
}

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
                    .action(async () => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("GET", "/api/v2/instances") : getHostClient().listInstances(), profileManager.getProfileConfig().format); });
            }),
            cmd("use", (c) => {
                c
                    .argument("<id>", "Instance id")
                    .desc("Select the Instance to communicate with by using '-' alias instead of Instance id")
                    .action(async (id: string) => {
                        try {
                            const native = getNativeCapabilities();
                            if (native) await native.json("GET", `/api/v2/instances/${encodeURIComponent(id)}`);
                            else await getHostClient().getInstanceInfo(id);
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
                    .action(async (id: string) => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("GET", `/api/v2/instances/${encodeURIComponent(getInstanceId(id))}`) : getHostClient().getInstanceInfo(getInstanceId(id)), profileManager.getProfileConfig().format); });
            }),
            cmd("health", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started")
                    .desc("Display Instance health status")
                    .action((id: string) => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("GET", `/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/health`) : getInstance(getInstanceId(id)).getHealth(), profileManager.getProfileConfig().format); });
            }),
            cmd("log", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .option("--log-format <pretty|json|raw>", "Render each log record")
                    .desc("Pipe the running Instance log to stdout")
                    .action((id: string, options: Record<string, unknown>) => {
                        const native = getNativeCapabilities();
                        return displayLogStream(native ? native.stream(`/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/logs`) : getInstance(getInstanceId(id)).getLogStream(), options.logFormat as any);
                    });
            }),
            cmd("kill", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started")
                    .option("--removeImmediately", "Remove instance from all flows right after kill")
                    .desc("Kill the Instance without waiting for the unfinished task")
                    .action(async (id: string, options: Record<string, unknown>) => {
                        const removeImmediately = options.removeImmediately as boolean || false;
                        const native = getNativeCapabilities();
                        const instanceKillResponse = native
                            ? await native.json("DELETE", instancePath(id), { mode: "kill" })
                            : await instanceKill(id, removeImmediately);

                        displayObject(instanceKillResponse, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("stop", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started")
                    .argument("<timeout>", "Timeout in milliseconds")
                    .desc("End the Instance gracefully waiting for the unfinished tasks")
                    .action(async (id: string, timeout: string) => {
                        const native = getNativeCapabilities();
                        return displayEntity(native
                            ? native.json("DELETE", instancePath(id), { mode: "stop", timeout: +timeout })
                            : getInstance(getInstanceId(id)).stop(+timeout, true),
                            profileManager.getProfileConfig().format);
                    });
            }),
            cmd("restart", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Kills the instance and start the new one from root sequence")
                    .action(async (id: string) => {
                        const native = getNativeCapabilities();
                        if (native) {
                            const path = instancePath(id);
                            const info = await native.json<{ instance?: { sequenceId?: string; sequence?: { id?: string } } }>("GET", path);
                            const sequenceId = info.instance?.sequenceId || info.instance?.sequence?.id;
                            if (!sequenceId) throw new CapabilityUnavailableError("Instance restart (native v2 instance metadata has no restartable sequence)");
                            let stopResponse: any;
                            let killResponse: any;
                            try {
                                stopResponse = await native.json("DELETE", path, { mode: "stop" });
                            } catch (_error) {
                                killResponse = await native.json("DELETE", path, { mode: "kill" });
                            }
                            if (stopResponse?.operation?.status === "failed" || stopResponse?.error) {
                                killResponse = await native.json("DELETE", path, { mode: "kill" });
                            }
                            const startResponse: any = await native.json("POST", `/api/v2/sequences/${encodeURIComponent(sequenceId)}/instances`, {});
                            const instanceId = startResponse?.result?.instance?.id;
                            if (typeof instanceId === "string" && instanceId) sessionConfig.setLastInstanceId(instanceId);
                            return displayObject({ stopResponse, killResponse, seqStartResponse: startResponse }, profileManager.getProfileConfig().format);
                        }
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
                        const native = getNativeCapabilities();
                        if (native) await native.upload("POST", `/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/input`, filename ? await getReadStreamFromFile(filename) : process.stdin, contentType);
                        else { const instanceClient = getInstance(getInstanceId(id)); await instanceClient.sendInput(filename ? await getReadStreamFromFile(filename) : process.stdin, {}, { type: contentType, end }); }
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
                        if (getNativeCapabilities()) throw new CapabilityUnavailableError("Instance inout (native v2 has no coupled duplex operation)");
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
                        const native = getNativeCapabilities();
                        return displayStream(native ? native.stream(`/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/output`) : getInstance(getInstanceId(id)).getStream("output"));
                    });
            }),
            cmd("stdio", (c) => {
                c
                    .alias("attach")
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Listen to all stdio - stdin, stdout, stderr of the running Instance")
                    .action(async (id: string) => {
                        if (getNativeCapabilities()) return attachNativeStdio(id);
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
                                    const native = getNativeCapabilities();
                                    if (native) return displayEntity(native.json("POST", `${instancePath(id)}/events`, { name: eventName, data: message }),
                                        profileManager.getProfileConfig().format);
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
                                    const native = getNativeCapabilities();

                                    if (native && stream) throw new CapabilityUnavailableError("Instance event streaming (native v2 has no event stream operation)");
                                    if (native && next) return displayEntity(native.json("GET", `${instancePath(id)}/events/${encodeURIComponent(event)}/once`), "json");
                                    if (native) return displayEntity(native.json("GET", `${instancePath(id)}/events/${encodeURIComponent(event)}`), "json");
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
                        const native = getNativeCapabilities();
                        if (native) return displayEntity(native.upload("PUT", `/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/stdio/0`, file ? await getReadStreamFromFile(file) : process.stdin), profileManager.getProfileConfig().format);
                        const instanceClient = getInstance(getInstanceId(id)); return displayEntity(instanceClient.sendStdin(file ? await getReadStreamFromFile(file) : process.stdin), profileManager.getProfileConfig().format);
                    });
            }),
            cmd("stderr", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Pipe the running Instance stderr stream to stdout")
                    .action((id: string) => { const native = getNativeCapabilities(); return displayStream(native ? native.stream(`/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/stdio/2`) : getInstance(getInstanceId(id)).getStream("stderr")); });
            }),
            cmd("stdout", (c) => {
                c
                    .argument("<id>", "Instance id or '-' for the last one started or selected")
                    .desc("Pipe the running Instance stdout stream to stdout")
                    .action((id: string) => {
                        const native = getNativeCapabilities();
                        return displayStream(native ? native.stream(`/api/v2/instances/${encodeURIComponent(getInstanceId(id))}/stdio/1`) : getInstance(getInstanceId(id)).getStream("stdout"));
                    });
            }),
            configControlCommands("instance")
        );
});
