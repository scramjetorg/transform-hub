import { CommandDefinition } from "../../types";
import { createWriteStream, lstatSync } from "fs";
import { defer } from "@scramjet/utility";
import { displayEntity, displayMessage, displayObject } from "../output";
import { getHostClient } from "../common";
import { getSequenceId, profileConfig, sessionConfig } from "../config";

import { PassThrough } from "stream";

import { isDevelopment } from "../../utils/envs";

import { resolve } from "path";
import { sequenceDelete, sequencePack, sequenceParseArgs, sequenceSendPackage, sequenceStart, waitForInstanceKills } from "../helpers/sequence";
import { ClientError } from "@scramjet/client-utils";
import { instanceKill } from "../helpers/instance";

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
        .description("Operations on a Sequence package, consisting of one or more functions executed one after another");

    sequenceCmd
        .command("list")
        .alias("ls")
        .description("Lists all available Sequences")
        .action(async () => displayEntity(getHostClient().listSequences(), profileConfig.format));

    sequenceCmd
        .command("pack")
        .argument("<path>")
        .option("-c, --stdout", "Output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .description("Create archived file (package) with the Sequence for later use")
        .action((path, { stdout, output: fileoutput }) => {
            const outputPath = fileoutput ? resolve(fileoutput) : `${resolve(path)}.tar.gz`;
            const output = stdout ? process.stdout : createWriteStream(outputPath);

            if (!stdout)
                sessionConfig.setLastPackagePath(outputPath);

            return sequencePack(path, { output });
        });

    sequenceCmd
        .command("send")
        .argument("<package>", "The file or directory to upload or '-' to use the last packed. If directory, it will be packed and send.")
        .option("--name <name>", "Allows to name sequence")
        .description("Send the Sequence package to the Hub")
        .action(
            async (sequencePackage: string, { name }) => {
                const sequenceClient = await sequenceSendPackage(sequencePackage, { name });

                displayObject(sequenceClient, profileConfig.format);
            }
        );

    sequenceCmd
        .command("update")
        .argument("<query>", "Sequence id or name to be overwritten")
        .argument("<package>", "The file to upload")
        .description("Updates sequence with given name")
        .action(
            async (query: string, sequencePackage: string) => {
                const sequenceClient = await sequenceSendPackage(sequencePackage, { name: query }, true);

                displayObject(sequenceClient, profileConfig.format);
            }
        );

    sequenceCmd
        .command("use")
        .alias("select")
        .description("Select the Sequence to communicate with by using '-' alias instead of Sequence id")
        .addHelpText("after", `\nCurrent Sequence id saved under '-' : ${sessionConfig.getConfig().lastSequenceId}`)
        .argument("<id>", "Sequence id")
        .action(async (id: string) => {
            try {
                await getHostClient().getSequence(id);
            } catch (error) {
                if (error instanceof ClientError && error.code === "NOT_FOUND") {
                    error.message = `Unable to find sequence ${id}`;
                }
                throw error;
            }

            sessionConfig.setLastSequenceId(id);
        });

    sequenceCmd
        .command("start")
        .argument("<id>", "Sequence id to start or '-' for the last uploaded")
        // TODO: for future implementation
        // .option("--hub <provider>", "aws|ovh|gcp");
        .option("-f, --config-file <path-to-file>", "Path to configuration file in JSON format to be passed to the Instance context")
        .option("-s, --config-string <json-string>", "Configuration in JSON format to be passed to the Instance context")
        .option("--output-topic <string>", "Topic to which the output stream should be routed")
        .option("--input-topic <string>", "Topic to which the input stream should be routed")
        .option("--args <json-string>", "Arguments to be passed to the first function in the Sequence")
        .option("--limits <json-string>", "Instance limits")
        .description("Start the Sequence with or without given arguments")
        .action(async (id, { configFile, configString, outputTopic, inputTopic, args: argsStr, limits: limitsStr }) => {
            let args;

            if (argsStr) args = sequenceParseArgs(argsStr);
            const limits = limitsStr ? JSON.parse(limitsStr) : {};

            const instanceClient = await sequenceStart(
                id, { configFile, configString, args, outputTopic, inputTopic, limits });

            displayObject(instanceClient, profileConfig.format);
        });

    type DeployArgs = {
        output: string;
        configFile: any;
        configString: string;
        args?: string;
    };

    sequenceCmd
        .command("deploy")
        .alias("run")
        .argument("<path>")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .option("-f, --config-file <path-to-file>", "Path to configuration file in JSON format to be passed to the Instance context")
        .option("-s, --config-string <json-string>", "Configuration in JSON format to be passed to the Instance context")
        // TODO: check if output-topic and input-topic should be added after development
        .option("--args <json-string>", "Arguments to be passed to the first function in the Sequence")
        .description("Pack (if needed), send and start the Sequence")
        .action(async (path: string, { output: fileoutput, configFile, configString, args: argsStr }: DeployArgs) => {
            let args;

            if (argsStr) args = sequenceParseArgs(argsStr);

            const output = new PassThrough();

            if (fileoutput) {
                const outputPath = fileoutput ? resolve(fileoutput) : `${resolve(path)}.tar.gz`;

                output.pipe(createWriteStream(outputPath));
                sessionConfig.setLastPackagePath(outputPath);
            }
            const { log: { format } } = profileConfig.getConfig();

            if (lstatSync(path).isDirectory()) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                const sendSeqPromise = getHostClient().sendSequence(output).then(seq => {
                    sessionConfig.setLastSequenceId(seq.id);
                });

                await sequencePack(path, { output });
                await sendSeqPromise;
            } else {
                const sequenceClient = await sequenceSendPackage(path, {});

                displayObject(sequenceClient, profileConfig.format);
            }

            const instanceClient = await sequenceStart("-", { configFile, configString, args });

            displayObject(instanceClient, format);
        });

    sequenceCmd
        .command("get")
        .argument("<id>", "Sequence id to start or '-' for the last uploaded")
        .description("Obtain a basic information about the Sequence")
        .action(async (id: string) => displayEntity(getHostClient().getSequence(getSequenceId(id)),
            profileConfig.format));

    sequenceCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
        .description("Delete the Sequence from the Hub")
        .action(async (id: string) => {
            try {
                const sequenceDeleteResponse = await sequenceDelete(id);

                displayObject(sequenceDeleteResponse, profileConfig.format);
            } catch (error) {
                if (error instanceof ClientError && error.code === "NOT_FOUND") {
                    error.message = `Unable to find sequence ${id}`;
                }
                throw error;
            }
        });

    sequenceCmd
        .command("prune")
        // .option("--all")
        // .option("--filter")
        .option("-f,--force", "Removes also active Sequences (with its running Instances)")
        .description("Remove all Sequences from the current scope (use with caution)")
        .action(async ({ force }) => {
            let seqs = await getHostClient().listSequences();
            const { lastSequenceId, lastInstanceId } = sessionConfig.getConfig();

            if (!seqs.length) {
                displayMessage("Sequence list is empty, nothing to delete.");
                return;
            }

            let fullSuccess = true;

            await Promise.all(
                seqs.map(async seq => {
                    const timeout = seq.instances.length * 5e3;

                    if (seq.instances.length) {
                        if (!force) {
                            displayMessage(`Sequence ${seq.id} has instances. Use --force to kill those.`);
                            return Promise.resolve();
                        }

                        await Promise.all(
                            seq.instances.map(async instanceId => instanceKill(instanceId, true, lastInstanceId))
                        );

                        displayMessage(`KILL requested for Instances of Sequence ${seq.id}. Waiting...`);

                        await defer(15000);
                        await waitForInstanceKills(seq, timeout);
                    }
                    return sequenceDelete(seq.id, lastSequenceId);
                })
            ).catch(error => {
                fullSuccess = false;

                if (isDevelopment()) {
                    displayMessage("error stack", error?.stack);
                }
            });

            if (!fullSuccess) {
                throw new Error("Some Sequences may have not been deleted.");
            }

            seqs = await getHostClient().listSequences();

            if (seqs.length) {
                throw new Error("Some Sequences may have not been deleted.");
            }

            displayMessage("Sequences removed successfully.");
        });
};
