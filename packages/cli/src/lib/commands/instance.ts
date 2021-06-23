import { CommandDefinition } from "../../types";

export const instance: CommandDefinition = (program) => {

    const instanceCmd = program
        .command("instance [command]")
        .alias("inst")
        .description("operations on instance");

    instanceCmd.command("kill <id>")
        .description("kill instance without waiting for unfinished tasks")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("stop <id>")
        .description("end instance gracefully waiting for unfinished tasks")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("status <id>")
        .description("status data about the instance")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("health <id>")
        .description("show the instance health status")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("info <id>")
        .description("show info about the instance")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("sendEvent <id> <json>")
        .description("send event with eventName and object|array|function|number")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("event <id> <json>")
        .description("invoke the event by eventName and optionally with message")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("input <id>")
        .description("send stream to input")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("output <id>")
        .description("show stream on output")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("stdout <id>")
        .description("show stream on stdout")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("stdin <id>")
        .description("send stream to stdin")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("stderr <id>")
        .description("show stream on stderr")
        .action((id) => {
            console.log("Instance id ", id);
        });
};
