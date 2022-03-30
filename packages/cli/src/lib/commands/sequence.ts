import { SequenceClient } from "@scramjet/api-client";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getReadStreamFromFile } from "../common";
import { getPackagePath, getSequenceId, sessionConfig } from "../config";
import { displayEntity, displayObject } from "../output";

async function resolveConfigJson(configJson: string, configPath: string): Promise<any> {
    return configJson || configPath ? JSON.parse(configJson || await readFile(configPath, "utf-8")) : {};
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
        .action(async (sequencePackage: string, args: any, opts) => {
            const { config: configPath, detached, configJson } = opts;
            const seq = await getHostClient(program).sendSequence(
                sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin
            );

            sessionConfig.setLastSequenceId(seq.id);
            const instance = await seq.start({
                appConfig: await resolveConfigJson(configJson, configPath),
                args });

            sessionConfig.setLastInstanceId(instance.id);

            if (!detached) {
                await attachStdio(program, instance);
            }
        });

    sequenceCmd
        .command("send")
        .description("Send packed and compressed sequence file")
        .argument("[<sequencePackage>]", "The file to upload or '-' to use the last packed. Leave empty for stdin.")
        .action(async (sequencePackage: string) => {
            const seq = await getHostClient(program).sendSequence(
                sequencePackage ? await getReadStreamFromFile(getPackagePath(sequencePackage)) : process.stdin
            );

            sessionConfig.setLastSequenceId(seq.id);

            return displayObject(program, seq);
        });

    /**
     * Command `si sequence list`
     * @returns {Object} with response or error
     */
    sequenceCmd
        .command("list")
        .alias("ls")
        .description("Lists available sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    /**
     * Command `si sequence select`
     */
    sequenceCmd
        .command("select")
        .description("Select a sequence id as default")
        .argument("<id>", "The sequence id")
        .action(async (id: string) => sessionConfig.setLastSequenceId(id) as unknown as void);

    /**
     * Command `si sequence start`
     * @param id sequence
     * @param appConfig
     * @param args for example '[10000, 2000]' | '["tcp"]'
     * @returns {Object} with response or error
     */
    sequenceCmd
        .command("start")
        .description("Starts a sequence")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        .argument("[args...]")
        .option("-c, --config <config-path>", "Appconfig path location")
        .option("-C, --config-json <config-string>", "Appconfig as string")
        .option("--output-topic <string>", "topic to which the output stream should be routed")
        .option("--input-topic <string>", "topic to which the input stream should be routed")
        .action(async (id: string, args: any, opts) => {
            const { config: configPath, configJson, outputTopic, inputTopic } = opts;
            const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient(program));

            const instance = await sequenceClient.start({
                appConfig: await resolveConfigJson(configJson, configPath),
                args,
                outputTopic,
                inputTopic
            });

            sessionConfig.setLastInstanceId(instance.id);
            return displayObject(program, instance);
        });

    /**
     * Command `si sequence start`
     * @param id sequence
     * @param appConfig
     * @param args for example '[10000, 2000]' | '["tcp"]'
     * @returns {Object} with response or error
     */
    sequenceCmd
        .command("get")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        .description("Obtains basic information about a sequence")
        .action(async (id: string) => {
            return displayEntity(program, getHostClient(program).getSequence(getSequenceId(id)));
        });

    /**
     * Command `si sequence delete`
     * @param id sequence
     */
    sequenceCmd
        .command("delete")
        .description("Removes the sequence from STH")
        .argument("<id>", "The sequence id to remove or '-' for the last uploaded.")
        .alias("rm")
        .action(async (id: string) => {
            return displayEntity(program, getHostClient(program).deleteSequence(getSequenceId(id)));
        });
};
