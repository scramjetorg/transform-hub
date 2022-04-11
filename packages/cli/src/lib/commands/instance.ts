/* eslint-disable no-console */
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getInstance, getReadStreamFromFile } from "../common";
import { getInstanceId, sessionConfig } from "../config";
import { displayEntity, displayStream } from "../output";

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
        .description("operations on running sequence");

    instanceCmd
        .command("list")
        .alias("ls")
        .description("list the instances")
        .action(async () => displayEntity(getHostClient().listInstances()));

    instanceCmd
        .command("use")
        .argument("<id>", "the instance id")
        .description("select an instance to communicate with")
        .action(async (id: string) => sessionConfig.setLastInstanceId(id) as unknown as void);

    instanceCmd
        .command("health")
        .argument("<id>", "the instance id or '-' for the last one started.")
        .description("display the instance health status")
        .action((id: string) => displayEntity(getInstance(getInstanceId(id)).getHealth()));

    instanceCmd
        .command("info")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .description("display info about the instance")
        .action(async (id: string) => displayEntity(getHostClient().getInstanceInfo(getInstanceId(id))));

    instanceCmd
        .command("log")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .description("pipe running instance log to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("log"));
        });

    instanceCmd
        .command("kill")
        .argument("<id>", "the instance id or '-' for the last one started.")
        .description("kill instance without waiting for unfinished task")
        .action(async (id: string) => displayEntity(getInstance(getInstanceId(id)).kill()));

    /**
     * @canCallKeepAlive
     * if true instance can prolong its lifetime
     * if false instance will end after timeout
     */
    instanceCmd
        .command("stop")
        .argument("<id>", "the instance id or '-' for the last one started.")
        .argument("<timeout>", "timeout in milliseconds.")
        .description("end instance gracefully waiting for unfinished tasks")
        .action(async (id: string, timeout: string) =>
            displayEntity(getInstance(getInstanceId(id)).stop(+timeout, true)));

    instanceCmd
        .command("input")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .argument("[file]", "the input file (stdin if not given default)")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .description("send file to input, if file not given the data will be read from stdin")
        .action(async (id: string, filename: string, { contentType }) => {
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(
                instanceClient.sendInput(filename
                    ? await getReadStreamFromFile(filename)
                    : process.stdin, { type: contentType, })
            );
        });

    instanceCmd
        .command("output")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .description("pipe running instance output to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("output"));
        });

    instanceCmd
        .command("stdio")
        .alias("attach")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .description("listen to all stdio - stdin, stdout, stderr of a running instance")
        .action(async (id: string) => {
            const inst = getInstance(getInstanceId(id));

            await attachStdio(inst);
        });

    const eventCmd = instanceCmd
        .command("event")
        .addHelpCommand(false)
        .description("show events commands");

    eventCmd
        .command("emit")
        .alias("invoke")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .argument("<eventName>", "the event name")
        .argument("[payload]", "pass JSON data to the instance")
        .description("send event with eventName and a JSON formatted event payload")
        .action(async (id: string, eventName: string, message: string) => {
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(instanceClient.sendEvent(eventName, message));
        });

    eventCmd
        .command("on")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .argument("<eventName>", "the event name")
        // .argument("[options]")
        .option("-n, --next", "wait for the next event occurrence")
        .option("-s, --stream", "stream the events (the stream will start with last event)")
        .description("get the last event occurrence (will wait for the first one if not yet retrieved)")
        .action(async (id: string, event: string, { next, stream }) => {
            if (stream) return displayStream(getInstance(getInstanceId(id)).getEventStream(event));
            if (next) return displayEntity(getInstance(getInstanceId(id)).getNextEvent(event));
            return displayEntity(getInstance(getInstanceId(id)).getEvent(event));
        });

    instanceCmd
        .command("stdin")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .argument("[file]", "the input file (stdin if not given default)")
        .description("send file to stdin, if file not given the data will be read from stdin")
        .action((id: string, file: string) => {
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(instanceClient.sendStdin(file ? createReadStream(file) : process.stdin));
        });

    instanceCmd
        .command("stderr")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .description("pipe running instances stderr stream to stdout")
        .action((id: string) => displayStream(getInstance(getInstanceId(id)).getStream("stderr")));

    instanceCmd
        .command("stdout")
        .argument("<id>", "the instance id or '-' for the last one started or selected.")
        .description("pipe running instances stdout stream to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("stdout"));
        });
};
