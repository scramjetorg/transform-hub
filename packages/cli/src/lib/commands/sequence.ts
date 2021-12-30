import { SequenceClient } from "@scramjet/api-client";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getReadStreamFromFile } from "../common";
import { displayEntity, displayObject } from "../output";

/**
 * Initializes `sequence` command.
 *
 * @param {Command} program Commander object.
 */
export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence [command]")
        .alias("seq")
        .description("operations on sequence");

    sequenceCmd
        .command("run [package] [args...]")
        .description("Uploads a package and immediately executes it with given arguments")
        .option("-d, --detached", "Don't attach to stdio")
        .option("-c, --config <path>", "Appconfig path location")
        .action(async (sequencePackage, args) => {
            const { config: configPath, detached } = sequenceCmd.opts();
            const config = configPath ? JSON.parse(await readFile(configPath, "utf-8")) : {};
            const seq = await getHostClient(program)
                .sendSequence(sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin);
            const instance = await seq.start(config, args);

            if (!detached) {
                await attachStdio(program, instance);
            }
        })
    ;

    sequenceCmd.command("send [<sequencePackage>]")
        .description("send packed and compressed sequence file")
        .action(async (sequencePackage) =>
            displayObject(program, await getHostClient(program).sendSequence(
                sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin
            ))
        );

    /**
     * Command `si sequence list`
     * @returns {Object} with response or error
     */
    sequenceCmd.command("list")
        .alias("ls")
        .description("list the sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    /**
    * Command `si sequence start`
    * @param id sequence
    * @param appConfig
    * @param args for example '[10000, 2000]' | '["tcp"]'
    * @returns {Object} with response or error
    */
    sequenceCmd.command("start")
        .arguments("<id> [args...]")
        .description("start the sequence")
        .option("-c, --config <config-path>")
        .option("-C, --config-json <config-string>")
        .action(async (id, args) => {
            const { config, configJson } = sequenceCmd.opts();
            const sequenceClient = SequenceClient.from(id, getHostClient(program));

            return displayObject(program,
                await sequenceClient.start(configJson || config ? JSON.parse(configJson || await readFile(config, "utf-8")) : {}, args));
        });

    /**
    * Command `si sequence start`
    * @param id sequence
    * @param appConfig
    * @param args for example '[10000, 2000]' | '["tcp"]'
    * @returns {Object} with response or error
    */
    sequenceCmd.command("get <id>")
        .description("get data about the sequence")
        .action(async (id) => displayEntity(program, getHostClient(program).getSequence(id)));

    /**
    * Command `si sequence delete`
    * @param id sequence
    */
    sequenceCmd.command("delete <id>")
        .alias("rm")
        .description("delete the sequence")
        .action(async (id) => displayEntity(program, getHostClient(program).deleteSequence(id)));
};
