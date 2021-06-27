import { InstanceClient } from "@scramjet/api-client";
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { getHostClient } from "../get-client";
import { displayEntity, displayObject } from "../output";

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
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id));
        });

    instanceCmd.command("stop <id>")
        .description("end instance gracefully waiting for unfinished tasks")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id));
        });

    instanceCmd.command("status <id>")
        .description("status data about the instance")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id).getStatus());
        });

    instanceCmd.command("health <id>")
        .description("show the instance health status")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id).getHealth());
        });

    instanceCmd.command("info <id>")
        .description("show info about the instance")
        .action(async (id) => displayEntity(program, getHostClient(program).getInstance(id)));

    instanceCmd.command("sendEvent <id> <eventName> <message>")
        .description("send event with eventName and object|array|function|number")
        .action((id, eventName, message) => {
            getHostClient(program);
            const instanceClient = InstanceClient.from(id);

            return displayObject(program, instanceClient.sendEvent(eventName, [message]));
        });

    instanceCmd.command("event <id> <eventName> <message>")
        .description("invoke the event by eventName and optionally with message")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id));
        });

    instanceCmd.command("input <id> <stream>")
        .description("send stream to input")
        .action((id, stream) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id).sendInput(stream));
        });

    instanceCmd.command("output <id>")
        .description("show stream on output")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id));
        });

    instanceCmd.command("stdout <id>")
        .description("show stream on stdout")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id).getStream(id));
        });

    instanceCmd.command("stdin <id> <stream>")
        .description("send stream to stdin")
        .action((id, stream) => {
            getHostClient(program);
            return displayObject(program,
                InstanceClient.from(id).sendStream(id, createReadStream(stream)));
        });

    instanceCmd.command("stderr <id>")
        .description("show stream on stderr")
        .action((id) => {
            getHostClient(program);
            return displayObject(program, InstanceClient.from(id));
        });
};
