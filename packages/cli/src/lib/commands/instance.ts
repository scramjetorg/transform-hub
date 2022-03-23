/* eslint-disable no-console */
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { /* attachStdio, */ getHostClient, getInstance, getReadStreamFromFile } from "../common";
import { getInstanceId /* , sessionConfig */ } from "../config";
import { displayEntity, displayStream } from "../output";

/**
 * Initializes `instance` command.
 *
 * @param {Command} program Commander object.
 */
export const instance: CommandDefinition = (program) => {
    const instanceCmd = program
        .command("instance [command]")
        .usage("si inst [subcommand] [options...]")
        .alias("inst")
        .description("operations on running sequence aka computing instance");
    // FIXME: which description should we leave?
    // .description("Instance is a running sequence aka computing instance.");

    instanceCmd
        .command("list")
        .alias("ls")
        .description("list the instances")
        .action(async () => displayEntity(program, getHostClient(program).listInstances()));

    instanceCmd
        .command("kill")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .description("kill instance without waiting for unfinished tasks")
        .action(async (id: string) => {
            return displayEntity(program, getInstance(program, getInstanceId(id)).kill());
        });

    /**
     * @canCallKeepAlive
     * if true instance can prolong its lifetime
     * if false instance will end after timeout
     */
    instanceCmd
        .command("stop")
        .argument("<id>", "The instance id or '-' for the last one started.")
        // FIXME: for what we use timeout?
        .argument("<timeout>", "Timeout in milliseconds.")
        .description("end instance gracefully waiting for unfinished tasks")
        .action(async (id: string, timeout: string) => {
            return displayEntity(program, getInstance(program, getInstanceId(id)).stop(+timeout, true));
        });

    instanceCmd
        .command("status")
        .alias("st")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .description("status data about the instance")
        .action((/* { all, filter, force } */) => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        .command("health")
        .argument("<id>", "The instance id or '-' for the last one started.")
        .description("show the instance health status")
        .action((id: string) => {
            return displayEntity(program, getInstance(program, getInstanceId(id)).getHealth());
        });

    instanceCmd
        .command("info")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("show info about the instance")
        .action(async (id: string) =>
            displayEntity(program, getHostClient(program).getInstanceInfo(getInstanceId(id)))
        );

    instanceCmd
        .command("event")
        .description("show event commands")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        //FIXME: should be 3 methods in separate subcomand? i.e. "si inst event emit"?
        .command("emit|trigger|invoke")
        .argument("<id>")
        .argument("<eventName>")
        .argument("[payload]")
        .description("send event with eventName and a JSON formatted event payload")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        //FIXME: should be in separate subcomand? i.e. "si inst event get"? alias somehow doesn't fit...
        .command("getEvent")
        .alias("on")
        .argument("[options]")
        .argument("<id>")
        .argument("<eventName>")
        .description("get the last event occurrence (will wait for the first one if not yet retrieved)")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        .command("input")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        // FIXME: so file is optional or required?
        .argument("[<file>]", "The input file (stdin if not given default)")
        // FIXME: get rid of this?
        // .option("-t, --content-type <value>", "Content-Type", "text/plain")
        .description("send file to input, if file not given the data will be read from stdin")
        .action(async (id: string, filename: string, { contentType }) => {
            const instanceClient = getInstance(program, getInstanceId(id));

            return displayEntity(
                program,
                instanceClient.sendInput(filename ? await getReadStreamFromFile(filename) : process.stdin, {
                    type: contentType,
                })
            );
        });

    instanceCmd
        .command("output")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        // FIXME: on which output standard?
        .description("show stream on output")
        .action((id: string) => {
            return displayStream(program, getInstance(program, getInstanceId(id)).getStream("output"));
        });

    instanceCmd
        .command("log")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        // FIXME: description doesn't describe constant work is it correct?
        // .description("Pipe running instance log to stdout")
        .description("show instance log")
        .action((id: string) => {
            return displayStream(program, getInstance(program, getInstanceId(id)).getStream("log"));
        });

    instanceCmd
        .command("stdio")
        .argument("<id>")
        .description("listen to all stdio - stdin, stdout, stderr of a instance")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        .command("stdin")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        // FIXME: so file is optional or required? Does descrition of default is ok?
        .argument("[<file>]", "The input file (stdin if not given default)")
        .description("send file to stdin, if file not given the data will be read from stdin")
        .action((id: string, stream: string) => {
            const instanceClient = getInstance(program, getInstanceId(id));

            return displayEntity(program, instanceClient.sendStdin(stream ? createReadStream(stream) : process.stdin));
        });

    instanceCmd
        .command("stderr")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("show stream on stderr")
        .action((id: string) => displayStream(program, getInstance(program, getInstanceId(id)).getStream("stderr")));

    instanceCmd
        .command("stdout")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .description("show stream on stdout")
        .action((id: string) => {
            return displayStream(program, getInstance(program, getInstanceId(id)).getStream("stdout"));
        });

    // FIXME: missing help [command] from draft

    instanceCmd
        // FIXME: receives suits better to provides?
        .command("requires")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("<topic-name>")
        .description("assign to an instance a topic that will consume the data")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    instanceCmd
        .command("provides")
        .argument("<id>", "The instance id or '-' for the last one started or selected.")
        .argument("<topic-name>")
        .description("assign to an instance a topic that will send the data")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    //TODO: cleanup
    // instanceCmd
    //     .command("select")
    //     .argument("<id>", "The instance id")
    //     .description("Select an instance id as default")
    //     .action(async (id: string) => sessionConfig.setLastInstanceId(id) as unknown as void);

    // instanceCmd
    //     .command("invokeEvent")
    //     .alias("emit")
    //     .description("Sends event with eventName and a JSON formatted event payload")
    //     .argument("<id>", "The instance id or '-' for the last one started or selected.")
    //     .arguments("<eventName> [<payload>]")
    //     .action(async (id: string, eventName: string, message: string) => {
    //         const instanceClient = getInstance(program, getInstanceId(id));

    //         return displayEntity(program, instanceClient.sendEvent(eventName, message));
    //     });

    // /**
    //  * No eventName.
    //  * Currently there is no event filtering.
    //  * Only the last event instance is returned
    //  */
    // instanceCmd
    //     .command("event")
    //     .description("Get the last event occurence (will wait for the first one if not yet retrieved)")
    //     .alias("on")
    //     .argument("<id>", "The instance id or '-' for the last one started or selected.")
    //     .argument("<eventName>", "The event name")
    //     .option("-s, --stream", "stream the events (the stream will start with last event)")
    //     .option("-n, --next", "wait for the next event occurrence")
    //     .action(async (id: string, event: string, { next, stream }) => {
    //         if (stream) return displayStream(program, getInstance(program, getInstanceId(id)).getEventStream(event));

    //         if (next) return displayEntity(program, getInstance(program, getInstanceId(id)).getNextEvent(event));

    //         return displayEntity(program, getInstance(program, getInstanceId(id)).getEvent(event));
    //     });

    // instanceCmd
    //     .command("attach")
    //     .argument("<id>", "The instance id or '-' for the last one started or selected.")
    //     .description("Connect to all stdio - stdin, stdout, stderr of a running instance")
    //     .action(async (id: string) => {
    //         const inst = getInstance(program, getInstanceId(id));

    //         await attachStdio(program, inst);
    //     });
};
