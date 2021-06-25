// import { SequenceClient } from "@scramjet/api-client";
import { CommandDefinition } from "../../types";
import { getHostClient } from "../get-client";
import { displayEntity } from "../output";

export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence [command]")
        .alias("seq")
        .description("operations on sequence");

    sequenceCmd.command("send <sequencePackage>")
        .description("send packed and compressed sequence file")
        .action(() => console.log("Not implemented"));
    // .action(async (sequencePackage) =>
    //     displayEntity(program, getHostClient(program).sendSequence(sequencePackage))
    // );

    sequenceCmd.command("list")
        .alias("ls")
        .description("list the sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    sequenceCmd.command("start <id>")
        .description("start the sequence")
        .action(async (id) => displayEntity(
            program, getHostClient(program).getSequence(id)
        ));

    sequenceCmd.command("get <id>")
        .description("get data about the sequence")
        .action(() => console.log("Not implemented"));
    // .action(async (id) => displayEntity(program, SequenceClient.from(id)));

    // response 500
    sequenceCmd.command("delete <id>")
        .alias("rm")
        .description("delete the sequence")
        .action(async (id) => displayEntity(program, getHostClient(program).deleteSequence(id)));
};
