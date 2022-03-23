// import { SequenceClient } from "@scramjet/api-client";
// import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { /* attachStdio, */ getHostClient /* , getReadStreamFromFile */ } from "../common";
import { /* getPackagePath, */ getSequenceId /* , sessionConfig  */ } from "../config";
import { displayEntity /* , displayObject */ } from "../output";

// async function resolveConfigJson(configJson: any, config: any): Promise<any> {
//     return configJson || config ? JSON.parse(configJson || (await readFile(config, "utf-8"))) : {};
// }

/**
 * Initializes `sequence` command.
 *
 * @param {Command} program Commander object.
 */
export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence")
        .alias("seq")
        .usage("si seq [subcommand] [options...]")
        // FIXME: get rid of "aka"?
        .description("operations on sequence of chained functions aka program");
    // FIXME: which description should we leave?
    // .description(`The sequence is a list of chained functions with a lightweight
    // application business logic that contains a developer code.
    // The minimal number is one function.`);

    sequenceCmd
        .command("pack")
        // FIXME: arguments should be required, and only path proposition <path>?
        .argument("[path|folder]")
        .description("create archived file (package) with sequence for later use")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    sequenceCmd
        .command("send")
        .argument("<folder|package>")
        .argument("[--start]")
        // FIXME: are args only needed when start?
        .argument("[args...]")
        .description("send package or folder to the hub and optionally start it")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    // TODO: cleanup after .command("send") implementation
    // sequenceCmd
    // .command("send")
    // .description("Send packed and compressed sequence file")
    // .argument("[<sequencePackage>]", "The file to upload or '-' to use the last packed. Leave empty for stdin.")
    // .action(async (sequencePackage: string) => {
    //     const seq = await getHostClient(program).sendSequence(
    //         sequencePackage ? await getReadStreamFromFile(getPackagePath(sequencePackage)) : process.stdin
    //     );

    //     sessionConfig.setLastSequenceId(seq.id);

    //     return displayObject(program, seq);
    // });

    sequenceCmd
        .command("list")
        .alias("ls")
        .description("list the sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    sequenceCmd
        .command("start")
        .argument("<id>")
        //FIXME: default values must be moved -won't work as --hub
        // .argument("[hub=aws|ovh|gcp]")
        //FIXME: proposition:
        .option("--hub <aws|ovh|gcp>")
        // FIXME: -won't work as described in hub: --args arg1 arg2
        .option("--args [args...]")
        .description("start the sequence with or without given arguments")
        .action((id, { hub, ...args }) => {
            // eslint-disable-next-line no-console
            console.log("id ", id, "hub ", hub, "args ", args);
            // TODO: implement me
            throw new Error("Implement me");
        });

    // TODO: cleanup after .command("start") implementation
    // /**
    //  * Command `si sequence start`
    //  * @param id sequence
    //  * @param appConfig
    //  * @param args for example '[10000, 2000]' | '["tcp"]'
    //  * @returns {Object} with response or error
    //  */
    // sequenceCmd
    //     .command("start")
    //     .description("Starts a sequence")
    //     .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
    //     .argument("[args...]")
    //     .option("-c, --config <config-path>", "Appconfig path location")
    //     .option("-C, --config-json <config-string>", "Appconfig as string")
    //     .action(async (id: string, args: any) => {
    //         const { config, configJson } = sequenceCmd.opts();
    //         const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient(program));

    //         const instance = await sequenceClient.start(await resolveConfigJson(configJson, config), args);

    //         sessionConfig.setLastInstanceId(instance.id);
    //         return displayObject(program, instance);
    //     });

    // FIXME: tego nie ma w nowym drafcie
    // sequenceCmd
    //     .command("run")
    //     .description("Uploads a package and immediately executes it with given arguments")
    //     .argument("<package>", "The file to upload or '-' to use the last packed")
    //     .argument("[args...]", "Additional args")
    //     .option("-d, --detached", "Don't attach to stdio")
    //     .option("-c, --config <config-path>", "Appconfig path location")
    //     .option("-C, --config-json <config-string>", "Appconfig as string")
    //     .action(async (sequencePackage: string, args: any) => {
    //         const { config: configPath, detached } = sequenceCmd.opts();
    //         const config = configPath ? JSON.parse(await readFile(configPath, "utf-8")) : {};
    //         const seq = await getHostClient(program).sendSequence(
    //             sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin
    //         );

    //         sessionConfig.setLastSequenceId(seq.id);
    //         const instance = await seq.start(config, args);

    //         sessionConfig.setLastInstanceId(instance.id);

    //         if (!detached) {
    //             await attachStdio(program, instance);
    //         }
    //     });

    sequenceCmd
        .command("get")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        //FIXME: maybe details sounds better? previous: Obtains basic information about a sequence
        .description("get data about the sequence")
        .action(async (id: string) => {
            return displayEntity(program, getHostClient(program).getSequence(getSequenceId(id)));
        });

    sequenceCmd
        .command("delete")
        .alias("rm")
        // FIXME: last uploaded or last used?
        .argument("<id>", "The sequence id to remove or '-' for the last uploaded.")
        .description("delete the sequence")
        .action(async (id: string) => {
            return displayEntity(program, getHostClient(program).deleteSequence(getSequenceId(id)));
        });

    sequenceCmd
        .command("prune")
        .option("--all")
        .option("--filter")
        .option("--force")
        .description("delete multiple sequences on actual selected hub")
        .action((/* { all, filter, force } */) => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    //TODO: cleanup
    // /**
    //  * Command `si sequence select`
    //  */
    // sequenceCmd
    //     .command("select")
    //     .description("Select a sequence id as default")
    //     .argument("<id>", "The sequence id")
    //     .action(async (id: string) => sessionConfig.setLastSequenceId(id) as unknown as void);
};
