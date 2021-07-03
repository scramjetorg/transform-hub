import { SequenceClient } from "@scramjet/api-client";
import { createReadStream } from "fs";
import { CommandDefinition } from "../../types";
import { getHostClient } from "../get-client";
import { displayEntity, displayObject } from "../output";

export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence [command]")
        .alias("seq")
        .description("operations on sequence");

    sequenceCmd.command("send <sequencePackage>")
        .description("send packed and compressed sequence file")
        .action(async (sequencePackage) =>
            displayObject(program, await getHostClient(program).sendSequence(
                createReadStream(sequencePackage)
            ))
        );

    sequenceCmd.command("list")
        .alias("ls")
        .description("list the sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    // args for example '[10000, 2000]' | '["tcp"]'
    sequenceCmd.command("start <id> <appConfig> <args>")
        .description("start the sequence")
        .action(async (id, appConfig, args) => {
            const sequenceClient = SequenceClient.from(id, getHostClient(program));

            return displayObject(program,
                await sequenceClient.start(JSON.parse(appConfig), JSON.parse(args)));
        });

    sequenceCmd.command("get <id>")
        .description("get data about the sequence")
        .action(async (id) => displayEntity(program, getHostClient(program).getSequence(id)));

    sequenceCmd.command("delete <id>")
        .alias("rm")
        .description("delete the sequence")
        .action(async (id) => displayEntity(program, getHostClient(program).deleteSequence(id)));
};
