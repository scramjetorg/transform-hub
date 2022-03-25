import { SequenceClient } from "@scramjet/api-client";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { attachStdio, getHostClient, getReadStreamFromFile, packAction } from "../common";
import { getPackagePath, getSequenceId, /* , sessionConfig  */
    sessionConfig } from "../config";
import { displayEntity, displayObject } from "../output";

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
        .description(`operations on a program to be executed on the Host,
         consisting of one or more functions executed one after another`);

    sequenceCmd
        .command("list")
        .alias("ls")
        .description("list the sequences")
        .action(async () => displayEntity(program, getHostClient(program).listSequences()));

    sequenceCmd
        .command("pack")
        .argument("<path>")
        // TODO: TO think?? if we use tar.gz shouldn't we use same shortcut names? -O, --to-stdout, -C, --directory=DIR?
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname")
        .description("create archived file (package) with sequence for later use")
        .action((path, { stdout, output }) => packAction(path, { stdout, output }));

    sequenceCmd
        .command("send")
        //TODO: description of package from old version- check if correct
        .argument("<package>", "The file to upload or '-' to use the last packed.")
        .description("send package or folder to the hub")
        .action(async (sequencePackage: string) => {
            const seq = await getHostClient(program).sendSequence(
                await getReadStreamFromFile(getPackagePath(sequencePackage))
            );

            sessionConfig.setLastSequenceId(seq.id);

            return displayObject(program, seq);
        });

    sequenceCmd
        .command("start")
        .argument("<id>")
        // TODO: add description from draft 2.0
        .option("--hub <provider>", "aws|ovh|gcp")
        // TODO: old description, waiting for fix + mission description of config file
        .option("-c, --config <config-path>", "Appconfig path location")
        // TODO: old description, waiting for fix
        .option("-C, --config-json <config-string>", "Appconfig as string")
        // TODO: add description
        .argument("[args...]")
        .description("start the sequence with or without given arguments")
        .action(async (id, args, { hub, config, configJson }) => {
            // eslint-disable-next-line no-console
            console.log("id ", id, "hub ", hub, "args ", "config", config, "json", configJson, args);
            if (hub) {
                // FIXME: implement me
                throw new Error("Implement me");
            }
            if (config && configJson) {
                // eslint-disable-next-line no-console
                console.error("Provide one source of configuration");
                return Promise.resolve();
            }
            let appConfig = {};

            try {
                if (configJson) appConfig = JSON.parse(configJson);
                if (config) appConfig = JSON.parse(await readFile(config, "utf-8"));
            } catch (_) {
                // eslint-disable-next-line no-console
                console.error("Unable to read configuration");
                return Promise.resolve();
            }
            const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient(program));

            const instance = await sequenceClient.start(appConfig, args);

            sessionConfig.setLastInstanceId(instance.id);
            return displayObject(program, instance);
        });

    sequenceCmd
        .command("deploy")
        //TODO: add prevoius run functionality
        .alias("run")
        .argument("<path>")
        // .argument("<package>", "The file to upload or '-' to use the last packed")
        // .argument("[args...]", "Additional args")
        // .option("-d, --detached", "Don't attach to stdio")
        // .option("-c, --config <config-path>", "Appconfig path location")
        // .option("-C, --config-json <config-string>", "Appconfig as string")
        // TODO: add description from draft 2.0
        .description("")
        //     .description("Uploads a package and immediately executes it with given arguments"
        .action(async (sequencePackage: string, args: any) => {
            const { config: configPath, detached } = sequenceCmd.opts();
            const config = configPath ? JSON.parse(await readFile(configPath, "utf-8")) : {};
            const seq = await getHostClient(program).sendSequence(
                sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin
            );

            sessionConfig.setLastSequenceId(seq.id);
            const instance = await seq.start(config, args);

            sessionConfig.setLastInstanceId(instance.id);

            if (!detached) {
                await attachStdio(program, instance);
            }
        });

    sequenceCmd
        .command("get")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        .description("obtain basic information about a sequence")
        .action(async (id: string) => {
            return displayEntity(program, getHostClient(program).getSequence(getSequenceId(id)));
        });

    sequenceCmd
        .command("delete")
        .alias("rm")
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
            // FIXME: implement me
            throw new Error("Implement me");
        });
};
