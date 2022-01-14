import { SequenceClient } from "@scramjet/api-client";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getReadStreamFromFile } from "../common";
import { getSequenceId, setConfigValue } from "../config";
import { displayEntity, displayObject } from "../output";

async function resolveConfigJson(configJson: any, config: any): Promise<any> {
    return configJson || config ? JSON.parse(configJson || await readFile(config, "utf-8")) : {};
}

/**
 * Initializes `sequence` command.
 *
 * @param {Command} program Commander object.
 */
export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence [command]")
        .alias("seq")
        .description("Performs operations on sequences");

    sequenceCmd
        .command("run")
        .description("Uploads a package and immediately executes it with given arguments")
        .argument("<package>", "The file to upload or '-' to use the last packed")
        .argument("[args...]", "Additional args")
        .option("-d, --detached", "Don't attach to stdio")
        .option("-c, --config <config-path>", "Appconfig path location")
        .option("-C, --config-json <config-string>", "Appconfig as string")
        .action(async (sequencePackage, args) => {
            const { config: configPath, detached } = sequenceCmd.opts();
            const config = configPath ? JSON.parse(await readFile(configPath, "utf-8")) : {};
            const seq = await getHostClient(program)
                .sendSequence(sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin);

            setConfigValue("lastSequenceId", seq.id);
            const instance = await seq.start(config, args);

            setConfigValue("lastInstanceId", instance.id);

            if (!detached) {
                await attachStdio(program, instance);
            }
        })
    ;

    sequenceCmd.command("send")
        .description("Send packed and compressed sequence file")
        .argument("[<sequencePackage>]", "The file to upload or '-' to use the last packed. Leave empty for stdin.")
        .action(async (sequencePackage) => {
            const seq = await getHostClient(program).sendSequence(
                sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin
            );

            setConfigValue("lastSequenceId", seq.id);

            return displayObject(program, seq);
        });

    /**
     * Command `si sequence list`
     * @returns {Object} with response or error
     */
    sequenceCmd.command("list")
        .alias("ls")
        .description("Lists available sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    /**
     * Command `si sequence select`
     */
    sequenceCmd.command("select")
        .description("Select a sequence id as default")
        .argument("<id>", "The sequence id")
        .action(async (id) => setConfigValue("lastSequenceId", id));

    /**
    * Command `si sequence start`
    * @param id sequence
    * @param appConfig
    * @param args for example '[10000, 2000]' | '["tcp"]'
    * @returns {Object} with response or error
    */
    sequenceCmd.command("start")
        .description("Starts a sequence")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        .argument("[args...]")
        .option("-c, --config <config-path>", "Appconfig path location")
        .option("-C, --config-json <config-string>", "Appconfig as string")
        .action(async (id, args) => {
            const { config, configJson } = sequenceCmd.opts();
            const sequenceClient = SequenceClient.from(
                getSequenceId(id),
                getHostClient(program)
            );

            const instance = await sequenceClient.start(await resolveConfigJson(configJson, config), args);

            setConfigValue("lastInstanceId", instance.id);
            return displayObject(program, instance);
        });

    /**
    * Command `si sequence start`
    * @param id sequence
    * @param appConfig
    * @param args for example '[10000, 2000]' | '["tcp"]'
    * @returns {Object} with response or error
    */
    sequenceCmd.command("get")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        .description("Obtains basic information about a sequence")
        .action(async (id) => {
            return displayEntity(
                program,
                getHostClient(program).getSequence(getSequenceId(id))
            );
        });

    /**
    * Command `si sequence delete`
    * @param id sequence
    */
    sequenceCmd.command("delete")
        .description("Removes the sequence from STH")
        .argument("<id>", "The sequence id to remove or '-' for the last uploaded.")
        .alias("rm")
        .action(async (id) => {
            return displayEntity(program, getHostClient(program).deleteSequence(
                getSequenceId(id)
            ));
        });
};
