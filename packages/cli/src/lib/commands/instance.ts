import { InstanceClient } from "@scramjet/api-client";
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { getHostClient } from "../get-client";
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
            getHostClient(program);
            return displayEntity(program, InstanceClient.from(id).kill());
        });

    /** 
     * @canCallKeepAlive
     * if true instance can prolong its lifetime  
     * if false instance will end after timeout  
    */
    instanceCmd.command("stop <id> <timeout>")
        .description("end instance gracefully waiting for unfinished tasks")
        .action(async (id, timeout) => {
            getHostClient(program);
            return displayEntity(program, InstanceClient.from(id).stop(+timeout, true));
        });

    instanceCmd.command("status <id>")
        .description("status data about the instance")
        .action(() => console.log("Not implemented"));

    instanceCmd.command("health <id>")
        .description("show the instance health status")
        .action((id) => {
            getHostClient(program);
            return displayEntity(program, InstanceClient.from(id).getHealth());
        });

    instanceCmd.command("info <id>")
        .description("show info about the instance")
        .action(async (id) => displayEntity(program, getHostClient(program).getInstance(id)));

    instanceCmd.command("sendEvent <id> <eventName> <message>")
        .description("send event with eventName and object|array|function|number")
        .action(async (id, eventName, message) => {
            getHostClient(program);
            const instanceClient = InstanceClient.from(id);

            return displayEntity(program, instanceClient.sendEvent(eventName, message));
        });

    /** 
     * No eventName. 
     * Currently there is no event filtering. 
     * Only the last event instance is returned 
     */
    instanceCmd.command("event <id>")
        .description("invoke the event by eventName and optionally with message")
        .action(async (id) => {
            getHostClient(program);
            console.log(program);

            const resp = await InstanceClient.from(id).getEvent();

            console.log(resp.status, resp?.data);
            return displayEntity(program, InstanceClient.from(id).getEvent());
        });

    instanceCmd.command("input <id> <stream>")
        .description("send stream to input")
        .action((id, stream) => {
            getHostClient(program);
            const instanceClient = InstanceClient.from(id);

            return displayEntity(program,
                instanceClient.sendStdin(createReadStream(stream)));
        });

    instanceCmd.command("output <id>")
        .description("show stream on output")
        .action((id) => {
            getHostClient(program);
            return displayStream(program, InstanceClient.from(id).getStream("output"));
        });

    instanceCmd.command("stdout <id>")
        .description("show stream on stdout")
        .action((id) => {
            getHostClient(program);
            return displayStream(program, InstanceClient.from(id).getStream("stdout"));
        });

    instanceCmd.command("log <id>")
        .description("show instance log")
        .action((id) => {
            getHostClient(program);
            return displayStream(program, InstanceClient.from(id).getStream("log"));
        });

    instanceCmd.command("stdin <id> <stream>")
        .description("send stream to stdin")
        .action((id, stream) => {
            getHostClient(program);
            const instanceClient = InstanceClient.from(id);

            return displayEntity(program,
                instanceClient.sendStdin(createReadStream(stream)));
        });

    instanceCmd.command("stderr <id>")
        .description("show stream on stderr")
        .action((id) => {
            getHostClient(program);
            return displayStream(program, InstanceClient.from(id).getStream("stderr"));
        });
};
