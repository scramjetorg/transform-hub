/* eslint-disable no-console */
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
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
        .usage("si inst [command] [options...]")
        .alias("inst")
        .description("operations on running sequence");

    instanceCmd
        .command("list")
        .alias("ls")
        .description("list the instances")
        .action(async () => displayEntity(getHostClient().listInstances()));

    instanceCmd
        .command("use")
        .argument("<id>", "The instance id")
        //TOOD: description doesn't match functionality- it's sets instance "-" value
        .description("select an instance to communicate with")
        .action(async (id: string) => sessionConfig.setLastInstanceId(id) as unknown as void);

    instanceCmd
        .command("kill")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .description("kill instance without waiting for unfinished tasks")
        .action(async (id: string) => displayEntity(getInstance(getInstanceId(id)).kill()));

    /**
     * @canCallKeepAlive
     * if true instance can prolong its lifetime
     * if false instance will end after timeout
     */
    instanceCmd
        .command("stop")
        .argument("<id>", "The instance id or '-' for the last one started.")
        // TODO: check in draft 2.0
        .argument("<timeout>", "Timeout in milliseconds.")
        .description("end instance gracefully waiting for unfinished tasks")
        .action(async (id: string, timeout: string) =>
            displayEntity(getInstance(getInstanceId(id)).stop(+timeout, true)));

    //TODO: status or info should probably removed, ask Michal
    instanceCmd
        .command("status")
        .alias("st")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .description("status data about the instance")
        .action((/* { all, filter, force } */) => {
            // FIXME: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        .command("health")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .description("show the instance health status")
        .action((id: string) => displayEntity(getInstance(getInstanceId(id)).getHealth()));

    instanceCmd
        .command("info")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("show info about the instance")
        .action(async (id: string) => displayEntity(getHostClient().getInstanceInfo(getInstanceId(id))));

    //move to long help
    const eventCmd = instanceCmd
        .command("event")
        .description("show event commands");

    eventCmd
        .command("emit")
        .alias("invoke")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("<eventName>", "The event name")
        .argument("[payload]")
        .description("send event with eventName and a JSON formatted event payload")
        .action(async (id: string, eventName: string, message: string) => {
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(instanceClient.sendEvent(eventName, message));
        });

    eventCmd
        .command("get")
        .argument("[options]")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("<eventName>", "The event name")
        .option("-n, --next", "wait for the next event occurrence")
        .option("-s, --stream", "stream the events (the stream will start with last event)")
        .description("get the last event occurrence (will wait for the first one if not yet retrieved)")
        .action(async (id: string, event: string, { next, stream }) => {
            if (stream) return displayStream(getInstance(getInstanceId(id)).getEventStream(event));
            if (next) return displayEntity(getInstance(getInstanceId(id)).getNextEvent(event));
            return displayEntity(getInstance(getInstanceId(id)).getEvent(event));
        });

    eventCmd
        .command("attach")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("Connect to all stdio - stdin, stdout, stderr of a running instance")
        .action(async (id: string) => {
            const inst = getInstance(getInstanceId(id));

            await attachStdio(inst);
        });

    instanceCmd
        .command("input")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("[file]", "The input file (stdin if not given default)")
        // TODO: add to draft 2.0 option -t
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
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("pipe running instance output to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("output"));
        });

    instanceCmd
        .command("log")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("Pipe running instance log to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("log"));
        });

    if (isDevelopment())
        instanceCmd
            .command("stdio")
            .argument("<id>")
            .description("listen to all stdio - stdin, stdout, stderr of a instance")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    //move to long help
    instanceCmd
        .command("stdin")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("[file]", "The input file (stdin if not given default)")
        .description("send file to stdin, if file not given the data will be read from stdin")
        .action((id: string, stream: string) => {
            // TODO: add file option
            const instanceClient = getInstance(getInstanceId(id));

            return displayEntity(instanceClient.sendStdin(stream ? createReadStream(stream) : process.stdin));
        });
    //move to long help
    instanceCmd
        .command("stderr")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("pipe running instances stderr stream to stdout")
        .action((id: string) => displayStream(getInstance(getInstanceId(id)).getStream("stderr")));
    //move to long help
    instanceCmd
        .command("stdout")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("pipe running instances stdout stream to stdout")
        .action((id: string) => {
            return displayStream(getInstance(getInstanceId(id)).getStream("stdout"));
        });
};
