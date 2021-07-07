import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getInstance } from "../common";
import { displayEntity, displayStream } from "../output";

export const instance: CommandDefinition = (program) => {

    const instanceCmd = program
        .command("instance [command]")
        .alias("inst")
        .description("operations on instance");

    instanceCmd.command("list")
        .alias("ls")
        .description("list the instances")
        .action(async () => displayEntity(program, getHostClient(program).listInstances()));

    instanceCmd.command("kill <id>")
        .description("kill instance without waiting for unfinished tasks")
        .action(async (id) => {
            return displayEntity(program, getInstance(program, id).kill());
        });

    /**
     * @canCallKeepAlive
     * if true instance can prolong its lifetime
     * if false instance will end after timeout
    */
    instanceCmd.command("stop <id> <timeout>")
        .description("end instance gracefully waiting for unfinished tasks")
        .action(async (id, timeout) => {
            return displayEntity(program, getInstance(program, id).stop(+timeout, true));
        });

    instanceCmd.command("status <id>")
        .description("status data about the instance")
        .action(() => console.log("Not implemented"));

    instanceCmd.command("health <id>")
        .description("show the instance health status")
        .action((id) => {
            return displayEntity(program, getInstance(program, id).getHealth());
        });

    instanceCmd.command("info <id>")
        .description("show info about the instance")
        .action(async (id) => displayEntity(program, getHostClient(program).getInstanceInfo(id)));

    instanceCmd.command("invokeEvent <id> <eventName> [<payload>]")
        .alias("emit")
        .description("send event with eventName and a JSON formatted event payload")
        .action(async (id, eventName, message) => {
            const instanceClient = getInstance(program, id);

            return displayEntity(program, instanceClient.sendEvent(eventName, message));
        });

    /**
     * No eventName.
     * Currently there is no event filtering.
     * Only the last event instance is returned
     */
    instanceCmd.command("event <id> <event>")
        .alias("on")
        .option("-s, --stream", "stream the events (the stream will start with last event)")
        .option("-n, --next", "wait for the next event occurrence")
        .description("get the last event occurence (will wait for the first one if not yet retrieved)")
        .action(async (id, event, { previous, stream }) => {
            if (stream)
                return displayStream(program, getInstance(program, id).getEventStream(event));

            if (previous)
                return displayEntity(program, getInstance(program, id).getEvent(event));
            return displayEntity(program, getInstance(program, id).getNextEvent(event));
        });

    instanceCmd.command("input <id> [<file>]")
        .description("send file to input, if file not given the data will be read from stdin")
        .action((id, stream) => {
            const instanceClient = getInstance(program, id);

            return displayEntity(program,
                instanceClient.sendStdin(stream ? createReadStream(stream) : process.stdin));
        });

    instanceCmd.command("output <id>")
        .description("show stream on output")
        .action((id) => {
            return displayStream(program, getInstance(program, id).getStream("output"));
        });

    instanceCmd.command("log <id>")
        .description("show instance log")
        .action((id) => {
            return displayStream(program, getInstance(program, id).getStream("log"));
        });

    instanceCmd.command("attach <id>")
        .description("connect to all stdio - stdin, stdout, stderr of a running instance")
        .action(async (id) => {
            const inst = getInstance(program, id);

            await attachStdio(program, inst);
        });

    instanceCmd.command("stdin <id> [<file>]")
        .description("send file to stdin, if file not given the data will be read from stdin")
        .action((id, stream) => {
            const instanceClient = getInstance(program, id);

            return displayEntity(program,
                instanceClient.sendStdin(stream ? createReadStream(stream) : process.stdin));
        });

    instanceCmd.command("stderr <id>")
        .description("show stream on stderr")
        .action((id) => {
            return displayStream(program, getInstance(program, id).getStream("stderr"));
        });

    instanceCmd.command("stdout <id>")
        .description("show stream on stdout")
        .action((id) => {
            return displayStream(program, getInstance(program, id).getStream("stdout"));
        });

};
