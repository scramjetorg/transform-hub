import { CommandDefinition } from "../../types";

export const instance: CommandDefinition = (program) => {

    const instanceCmd = program
        .command("instance [command]")
        .alias("inst")
        .description("operations on instance, see what is instance: <URL>");

    instanceCmd.command("kill <id>")
        .description("kill the instance")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("stop <id>")
        .description("stop the instance")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("get <id>")
        .description("get data about the instance")
        .action((id) => {
            console.log("Instance id ", id);
        });

    instanceCmd.command("delete <id>")
        .alias("rm")
        .description("delete the instance")
        .action((id) => {
            console.log("Instance id ", id);
        });
};
