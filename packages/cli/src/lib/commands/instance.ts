/* eslint-disable no-console */
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getInstance, getReadStreamFromFile } from "../common";
import { getInstanceId, setConfigValue } from "../config";
import { displayEntity, displayStream } from "../output";

/**
 * Initializes `instance` command.
 *
 * @param {Command} program Commander object.
 */
export const instance: CommandDefinition = (program) => {
    const instanceCmd = program
        .command("instance [command]")
        .alias("inst")
        .description("operations on instance");

    instanceCmd.command("list")
        .alias("ls")
        .description("list the instances")
        .action(async () => displayEntity(program, getHostClient(program).listInstances()));

    instanceCmd.command("kill")
        .description("Kill instance immediately without waiting for unfinished tasks")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .action(async (id) => {
            return displayEntity(program, getInstance(program, getInstanceId(id)).kill());
        });

    /**
     * @canCallKeepAlive
     * if true instance can prolong its lifetime
     * if false instance will end after timeout
    */
    instanceCmd.command("stop")
        .description("End instance gracefully with waiting for unfinished tasks")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .argument("<timeout>", "Timeout in milliseconds.")
        .action(async (id, timeout) => {
            return displayEntity(program, getInstance(program, getInstanceId(id)).stop(+timeout, true));
        });

    instanceCmd.command("status")
        .description("Display status data about the instance")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .action(() => {
            console.log("Not implemented");
        });

    instanceCmd.command("health")
        .description("Display last instance health status")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .action((id) => {
            return displayEntity(
                program,
                getInstance(program, getInstanceId(id)).getHealth()
            );
        });

    instanceCmd.command("select")
        .description("Select an instance id as default")
        .argument("<id>", "The instance id")
        .action(async (id) => setConfigValue("lastInstanceId", id));

    instanceCmd.command("info")
        .description("Display info about the instance")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .action(async (id) => displayEntity(
            program,
            getHostClient(program).getInstanceInfo(getInstanceId(id))
        ));

    instanceCmd.command("invokeEvent")
        .alias("emit")
        .description("Sends event with eventName and a JSON formatted event payload")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .arguments("<eventName> [<payload>]")
        .action(async (id, eventName, message) => {
            const instanceClient = getInstance(program, getInstanceId(id));

            return displayEntity(
                program,
                instanceClient.sendEvent(eventName, message)
            );
        });

    /**
     * No eventName.
     * Currently there is no event filtering.
     * Only the last event instance is returned
     */
    instanceCmd.command("event")
        .description("Get the last event occurence (will wait for the first one if not yet retrieved)")
        .alias("on")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("<eventName>", "The event name")
        .option("-s, --stream", "stream the events (the stream will start with last event)")
        .option("-n, --next", "wait for the next event occurrence")
        .action(async (id, event, { next, stream }) => {
            if (stream)
                return displayStream(
                    program,
                    getInstance(program, getInstanceId(id)).getEventStream(event)
                );

            if (next)
                return displayEntity(
                    program,
                    getInstance(program, getInstanceId(id)).getNextEvent(event)
                );

            return displayEntity(
                program,
                getInstance(program, getInstanceId(id)).getEvent(event)
            );
        });

    instanceCmd.command("input")
        .description("Sends file to input, if file not given the data will be read from stdin")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("[<file>]", "The input file (stdin if not given default)")
        .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .action(async (id, filename, { contentType }) => {
            const instanceClient = getInstance(program, getInstanceId(id));

            return displayEntity(program,
                instanceClient.sendInput(
                    filename ? await getReadStreamFromFile(filename) : process.stdin,
                    { type: contentType }
                )
            );
        });

    instanceCmd.command("output")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("Pipe running instance output to stdout")
        .action((id) => {
            return displayStream(program, getInstance(program, getInstanceId(id)).getStream("output"));
        });

    instanceCmd.command("log")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("Pipe running instance log to stdout")
        .action((id) => {
            return displayStream(program, getInstance(program, getInstanceId(id)).getStream("log"));
        });

    instanceCmd.command("attach")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("Connect to all stdio - stdin, stdout, stderr of a running instance")
        .action(async (id) => {
            const inst = getInstance(program, getInstanceId(id));

            await attachStdio(program, inst);
        });

    instanceCmd.command("stdin")
        .description("Send file to stdin, if file not given the data will be read from stdin")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("[<file>]", "The input file (stdin if not given default)")
        .action((id, stream) => {
            const instanceClient = getInstance(program, getInstanceId(id));

            return displayEntity(
                program,
                instanceClient.sendStdin(stream ? createReadStream(stream) : process.stdin)
            );
        });

    instanceCmd.command("stderr")
        .description("Pipe running instances stderr stream to stdout")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .action((id) => displayStream(
            program,
            getInstance(program, getInstanceId(id)).getStream("stderr")
        ));

    instanceCmd.command("stdout")
        .description("Pipe running instances stdout stream to stdout")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .action((id) => {
            return displayStream(program, getInstance(program, getInstanceId(id)).getStream("stdout"));
        });
};
