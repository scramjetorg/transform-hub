import { SequenceClient } from "@scramjet/api-client";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { attachStdio, getHostClient, getReadStreamFromFile, packAction } from "../common";
import { getPackagePath, getSequenceId, sessionConfig } from "../config";
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
        .usage("si seq [command] [options...]")
        .description(`operations on a program to be executed on the Host,
         consisting of one or more functions executed one after another`);

    sequenceCmd
        .command("list")
        .alias("ls")
        .description("list the sequences")
        .action(async () => displayEntity(getHostClient().listSequences()));

    sequenceCmd
        .command("pack")
        .argument("<path>")
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname")
        .description("create archived file (package) with sequence for later use")
        .action((path, { stdout, output }) => packAction(path, { stdout, output }));

    sequenceCmd
        .command("send")
        .argument("<package>", "The file to upload or '-' to use the last packed.")
        .description("send package or folder to the hub")
        .action(async (sequencePackage: string) => {
            const seq = await getHostClient().sendSequence(
                await getReadStreamFromFile(getPackagePath(sequencePackage))
            );

            sessionConfig.setLastSequenceId(seq.id);

            return displayObject(seq);
        });

    sequenceCmd
        .command("start")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        // TODO: for future impolemenation
        // .option("--hub <provider>", "aws|ovh|gcp");
        .option("-f, --config-file <path-to-file>", "path to configuration file in JSON format to be passed to instance context")
        .option("-s, --config-string <json-string>", "configuration in JSON format to be passed to instance context")
        .option("--args <json-string>", "arguments to be passed to first function in Sequence")
        .description("start the sequence with or without given arguments")
        .action(async (id, { config: configFile, configString, args }) => {
            if (configFile && configString) {
                // eslint-disable-next-line no-console
                console.error("Provide one source of configuration");
                return Promise.resolve();
            }
            let appConfig = {};

            try {
                if (configString) appConfig = JSON.parse(configString);
                if (configFile) appConfig = JSON.parse(await readFile(configFile, "utf-8"));
            } catch (_) {
                // eslint-disable-next-line no-console
                console.error("Unable to read configuration");
                return Promise.resolve();
            }
            const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient());

            const instance = await sequenceClient.start(appConfig, args);

            sessionConfig.setLastInstanceId(instance.id);
            return displayObject(instance);
        });

    if (isDevelopment())
        sequenceCmd
            .command("deploy")
        //TODO: add prevoius run functionality
            .alias("run")
            .argument("<path>")
        // .argument("<package>", "The file to upload or '-' to use the last packed")
        // .argument("[args...]", "Additional args")
        //TODO: fix description
        // .option("-d, --detached", "Don't attach to stdio")
        // .option("-c, --config <config-path>", "Appconfig path location")
        // .option("-C, --config-json <config-string>", "Appconfig as string")
        // TODO: add description from draft 2.0
            .description("")
        //     .description("Uploads a package and immediately executes it with given arguments"
            .action(async (sequencePackage: string, args: any) => {
            //FIXME: implement me, get rid of sequenceCmd.opts()
                const { config: configPath, detached } = sequenceCmd.opts();
                const config = configPath ? JSON.parse(await readFile(configPath, "utf-8")) : {};
                const seq = await getHostClient().sendSequence(
                    sequencePackage ? await getReadStreamFromFile(sequencePackage) : process.stdin
                );

                sessionConfig.setLastSequenceId(seq.id);
                const instance = await seq.start(config, args);

                sessionConfig.setLastInstanceId(instance.id);

                if (!detached) {
                    await attachStdio(instance);
                }
            });

    sequenceCmd
        .command("get")
        .argument("<id>", "The sequence id to start or '-' for the last uploaded.")
        .description("obtain basic information about a sequence")
        .action(async (id: string) => displayEntity(getHostClient().getSequence(getSequenceId(id))));

    sequenceCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The sequence id to remove or '-' for the last uploaded.")
        .description("delete the sequence")
        .action(async (id: string) => displayEntity(getHostClient().deleteSequence(getSequenceId(id))));

    if (isDevelopment())
        sequenceCmd
            .command("prune")
            .option("--all")
            .option("--filter")
            .option("--force")
            .description("delete multiple sequences on actual selected hub")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });
};
