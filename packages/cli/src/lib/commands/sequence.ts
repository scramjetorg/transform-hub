import { SequenceClient } from "@scramjet/api-client";
import { lstatSync } from "fs";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { getHostClient, getInstance, getReadStreamFromFile, packAction } from "../common";
import { getPackagePath, getSequenceId, sessionConfig } from "../config";
import { displayEntity, displayMessage, displayObject } from "../output";

const sendPackage = async (sequencePackage: string) => {
    const seq = await getHostClient().sendSequence(
        await getReadStreamFromFile(getPackagePath(sequencePackage))
    );

    sessionConfig.setLastSequenceId(seq.id);

    return displayObject(seq);
};

const startSequence = async (id: string, { configFile, configString, args, outputTopic, inputTopic }:
    {configFile: any, configString: string, args?: any[], outputTopic? : string, inputTopic?: string}) => {
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
        return Promise.reject();
    }
    const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient());

    const instance = await sequenceClient.start({ appConfig, args, outputTopic, inputTopic });

    sessionConfig.setLastInstanceId(instance.id);
    return displayObject(instance);
};

/**
 * Initializes `sequence` command.
 *
 * @param {Command} program Commander object.
 */
export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence")
        .addHelpCommand(false)
        .alias("seq")
        .usage("[command] [options...]")
        .description("operations on a program, consisting of one or more functions executed one after another");

    sequenceCmd
        .command("list")
        .alias("ls")
        .description("lists available sequences")
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
        .action(async (sequencePackage: string) => sendPackage(sequencePackage));

    sequenceCmd
        .command("use")
        .alias("select")
        .description(`specify the hub sequence to use (current: ${sessionConfig.getConfig().lastSequenceId})`)
        .argument("<id>", "The sequence id")
        .action(async (id: string) => sessionConfig.setLastSequenceId(id) as unknown as void);

    if (isDevelopment())
        sequenceCmd
            .command("start")
            .argument("<id>", "the sequence id to start or '-' for the last uploaded.")
        // TODO: for future impolemenation
        // .option("--hub <provider>", "aws|ovh|gcp");
            .option("-f, --config-file <path-to-file>", "path to configuration file in JSON format to be passed to instance context")
            .option("-s, --config-string <json-string>", "configuration in JSON format to be passed to instance context")
            .option("--output-topic <string>", "topic to which the output stream should be routed")
            .option("--input-topic <string>", "topic to which the input stream should be routed")
            .option("--args <json-string>", "arguments to be passed to first function in Sequence")
            .description("start the sequence with or without given arguments")
            .action(async (id, { configFile, configString, outputTopic, inputTopic, args }) =>
                startSequence(id, { configFile, configString, args, outputTopic, inputTopic }));
    else
        sequenceCmd
            .command("start")
            .argument("<id>", "the sequence id to start or '-' for the last uploaded.")
            .option("-f, --config-file <path-to-file>", "path to configuration file in JSON format to be passed to instance context")
            .option("-s, --config-string <json-string>", "configuration in JSON format to be passed to instance context")
            .option("--args <json-string>", "arguments to be passed to first function in Sequence")
            .description("start the sequence with or without given arguments")
            .action(async (id, { configFile, configString, args }) =>
                startSequence(id, { configFile, configString, args }));

    sequenceCmd
        .command("deploy")
        .alias("run")
        .argument("<path>")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname")
        .option("-f, --config-file <path-to-file>", "path to configuration file in JSON format to be passed to instance context")
        .option("-s, --config-string <json-string>", "configuration in JSON format to be passed to instance context")
        // TODO: check if output-topic and input-topic should be added after developement
        .option("--args <json-string>", "arguments to be passed to first function in Sequence")
        .description("pack (if needed), send and start the sequence")
        .action(async (path: string, { output, configFile, configString, args }:
                {output: string, configFile: any, configString: string, args: any}) => {
            if (lstatSync(path).isDirectory()) {
                await packAction(path, { stdout: false, output });
                await sendPackage("-");
            } else
                await sendPackage(path);
            await startSequence("-", { configFile, configString, args });
        });

    sequenceCmd
        .command("get")
        .argument("<id>", "the sequence id to start or '-' for the last uploaded.")
        .description("obtain basic information about a sequence")
        .action(async (id: string) => displayEntity(getHostClient().getSequence(getSequenceId(id))));

    sequenceCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "the sequence id to remove or '-' for the last uploaded.")
        .description("delete the sequence form Hub")
        .action(async (id: string) => displayEntity(getHostClient().deleteSequence(getSequenceId(id))));

    sequenceCmd
        .command("prune")
        // .option("--all")
        // .option("--filter")
        .option("-f,--force", "Removes also active sequences")
        .description("delete multiple sequences on actualy selected hub")
        .action(async ({ force }) => {
            const seqs = await getHostClient().listSequences();

            const { lastSequenceId, lastInstanceId } = sessionConfig.getConfig();

            for (const seq of seqs) {
                if (seq.instances.length) {
                    if (!force) {
                        displayMessage(`Sequence ${seq.id} has running instances, use --force to kill those.`);
                        continue;
                    }
                    // maybe we should stop
                    displayMessage(`Killing instances of sequence ${seq.id}`);
                    await Promise.all(
                        seq.instances.map(async (id) => {
                            if (lastInstanceId === id) sessionConfig.setLastInstanceId("");

                            return getInstance(id).kill();
                        })
                    );
                }

                await getHostClient().deleteSequence(seq.id);

                if (lastSequenceId === seq.id) sessionConfig.setLastSequenceId("");
            }
        });
};
