import { CommandDefinition } from "../../types";

export const sequence: CommandDefinition = (program) => {

    const sequenceCmd = program
        .command("sequence [command]")
        .alias("seq")
        .description("operations on sequence");

    sequenceCmd.command("list")
        .alias("ls")
        .description("list the sequences")
        .action(() => {
            console.log("Not implemented");
        });

    sequenceCmd.command("start <id>")
        .description("start the sequence")
        .action(() => {
            console.log("Not implemented");
        });

    sequenceCmd.command("get <id>")
        .description("get data about the sequence")
        .action(() => {
            console.log("Not implemented");
        });

    sequenceCmd.command("delete <id>")
        .alias("rm")
        .description("delete the sequence")
        .action(() => {
            console.log("Not implemented");
        });
};
