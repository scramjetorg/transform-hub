/* eslint-disable no-console */
import { instanceKill } from "../helpers/instance";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getInstance, getReadStreamFromFile } from "../common";
import { getInstanceId, profileConfig, sessionConfig } from "../config";
import { displayEntity, displayObject, displayStream } from "../output";
import { ClientError } from "@scramjet/client-utils";

/**
 * Initializes `instance` command.
 *
 * @param {Command} program Commander object.
 */
export const instance: CommandDefinition = (program) => {
    const instanceCmd = program
        .command("instance [command]")
        .addHelpCommand(false)
        .alias("inst")
        .usage("[command] [options...]")
        .description("Operations on the running Sequence");

    instanceCmd
        .command("list")
        .alias("ls")
        .description("List the Instances")
        .action(async () => displayEntity(getHostClient().listInstances(), profileConfig.format));

    instanceCmd
        .command("use")
        .argument("<id>", "Instance id")
        .description("Select the Instance to communicate with by using '-' alias instead of Instance id")
        .addHelpText("after", `\nCurrent Instance id saved under '-' : ${sessionConfig.getConfig().lastInstanceId}`)
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

    instanceCmd
        .command("health")
        .argument("<id>", "Instance id or '-' for the last one started")
        .description("Display Instance health status")
        .action((id: string) => displayEntity(getInstance(getInstanceId(id)).getHealth(),
            profileConfig.format));

    instanceCmd
        .command("info")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .description("Display the info about the Instance")
        .action(async (id: string) => displayEntity(getHostClient().getInstanceInfo(getInstanceId(id)),
            profileConfig.format));

    instanceCmd
        .command("log")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .description("Pipe the running Instance log to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("log"));
        });

    instanceCmd
        .command("kill")
        .argument("<id>", "Instance id or '-' for the last one started")
        .option("--removeImmediately", "Remove instance from all flows right after kill")
        .description("Kill the Instance without waiting for the unfinished task")
        .action(async (id: string, { removeImmediately = false }: { removeImmediately: boolean }) => {
            const instanceKillResponse = await instanceKill(id, removeImmediately);

            displayObject(instanceKillResponse, profileConfig.format);
        }
        );

    /**
     * @canCallKeepAlive
     * if true Instance can prolong its lifetime
     * if false Instance will end after timeout
     */
    instanceCmd
        .command("stop")
        .argument("<id>", "Instance id or '-' for the last one started")
        .argument("<timeout>", "Timeout in milliseconds")
        .description("End the Instance gracefully waiting for the unfinished tasks")
        .action(async (id: string, timeout: string) =>
            displayEntity(getInstance(getInstanceId(id)).stop(+timeout, true),
                profileConfig.format));

    instanceCmd
        .command("input")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .argument("[file]", "File with data")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .option("-e, --end", "Close the input stream of the Instance when this stream ends, \"x-end-stream\" header", false)
        .description("Send a file to input, if no file given the data will be read directly from the console input (stdin)")
        .action(async (id: string, filename: string, { contentType, end }) => {
            const instanceClient = getInstance(getInstanceId(id));

            await instanceClient.sendInput(filename ? await getReadStreamFromFile(filename) : process.stdin, {},
                { type: contentType, end });
        });

    instanceCmd
        .command("output")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .description("Pipe the running Instance output to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("output"));
        });

    instanceCmd
        .command("stdio")
        .alias("attach")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .description("Listen to all stdio - stdin, stdout, stderr of the running Instance")
        .action(async (id: string) => {
            const inst = getInstance(getInstanceId(id));

            await attachStdio(inst);
        });

    const eventCmd = instanceCmd
        .command("event")
        .addHelpCommand(false)
        .description("Show event commands");

    eventCmd
        .command("emit")
        .alias("invoke")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .argument("<eventName>", "The event name")
        .argument("[payload]", "Pass a JSON data to the Instance")
        .description("Send event with eventName and a JSON formatted event payload")
        .action(async (id: string, eventName: string, message: string) => {
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(instanceClient.sendEvent(eventName, message),
                profileConfig.format);
        });

    eventCmd
        .command("on")
        .argument("<id>", "The instance id or '-' for the last one started or selected")
        .argument("<eventName>", "The event name")
        // .argument("[options]")
        .option("-n, --next", "Wait for the next event occurrence")
        .option("-s, --stream", "Stream the events (the stream will start with last event)")
        .description("Get the last event occurrence (will wait for the first one if not yet retrieved)")
        .action(async (id: string, event: string, { next, stream }) => {
            if (stream) return displayStream(getInstance(getInstanceId(id)).getEventStream(event));
            if (next) return displayEntity(getInstance(getInstanceId(id)).getNextEvent(event),
                profileConfig.format);
            return displayEntity(getInstance(getInstanceId(id)).getEvent(event), profileConfig.format);
        });

    instanceCmd
        .command("stdin")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .argument("[file]", "The input file (stdin if not given default)")
        .description("Send a file to stdin, if no file given the data will be read from stdin")
        .action(async (id: string, file: string) => {
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(instanceClient.sendStdin(file ? await getReadStreamFromFile(file) : process.stdin),
                profileConfig.format);
        });

    instanceCmd
        .command("stderr")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .description("Pipe the running Instance stderr stream to stdout")
        .action((id: string) => displayStream(getInstance(getInstanceId(id)).getStream("stderr")));

    instanceCmd
        .command("stdout")
        .argument("<id>", "Instance id or '-' for the last one started or selected")
        .description("Pipe the running Instance stdout stream to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("stdout"));
        });
};
