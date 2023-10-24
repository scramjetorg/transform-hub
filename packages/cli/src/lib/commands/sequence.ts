/* eslint-disable max-len */
import { CommandDefinition } from "../../types";
import { createWriteStream, lstatSync } from "fs";
import { displayEntity, displayError, displayMessage, displayObject } from "../output";
import { getHostClient } from "../common";
import { getSequenceId, profileManager, sessionConfig } from "../config";

import { PassThrough, Writable } from "stream";

import { isDevelopment } from "../../utils/envs";

import { resolve } from "path";
import { sequenceDelete, sequencePack, sequenceParseArgs, sequenceSendPackage, sequenceStart } from "../helpers/sequence";
import { ClientError } from "@scramjet/client-utils";
import { initPlatform } from "../platform";

/**
 * Initializes `sequence` command.
 *
 * @param {Command} program Commander object.
 */
export const sequence: CommandDefinition = (program) => {
    const sequenceCmd = program
        .command("sequence")
        .hook("preAction", initPlatform)
        .addHelpCommand(false)
        .configureHelp({ showGlobalOptions: true })
        .alias("seq")
        .usage("[command] [options...]")
        .description("Operations on a Sequence package, consisting of one or more functions executed one after another");

    sequenceCmd
        .command("list")
        .alias("ls")
        .description("List all Sequences available on Hub")
        .option("-n, --name <sequence-name>", "list id's of sequences with a given name")
        .action(async ({ name } :{name:string}) => {
            if (name) return await displayEntity(await getHostClient().getSequenceId(name), profileManager.getProfileConfig().format);

            return await displayEntity(getHostClient().listSequences(), profileManager.getProfileConfig().format);
        });

    sequenceCmd
        .command("use")
        .alias("select")
        .description("Select the Sequence to communicate with by using '-' alias instead of Sequence id")
        .addHelpText("after", `\nCurrent Sequence id saved under '-' : ${sessionConfig.lastSequenceId}`)
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
        .command("info")
        .argument("<id>", "Sequence id to start or '-' for the last uploaded")
        .description("Display a basic information about the Sequence")
        .action(async (id: string) => displayEntity(getHostClient().getSequence(getSequenceId(id)),
            profileManager.getProfileConfig().format));

    sequenceCmd
        .command("pack")
        .argument("<path>")
        .option("-c, --stdout", "Output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .description("Create archived file (package) with the Sequence for later use")
        .action((path, { stdout, output: fileoutput }) => {
            const outputPath: string = fileoutput ? resolve(fileoutput) : `${resolve(path)}.tar.gz`;
            const output: Writable = stdout ? process.stdout : createWriteStream(outputPath);

            if (!stdout)
                sessionConfig.setLastPackagePath(outputPath);

            return sequencePack(path, { output });
        });

    sequenceCmd
        .command("send")
        .argument("<package>", "The file or directory to upload or '-' to use the last packed. If directory, it will be packed and sent.")
        .option("--name <name>", "Allows to name sequence")
        .description("Send the Sequence package to the Hub")
        .action(
            async (sequencePackage: string, { name }) => {
                const sequenceClient = await sequenceSendPackage(sequencePackage, { name }, false, { progress: sequenceCmd.parent?.getOptionValue("progress") });

                displayObject(sequenceClient, profileManager.getProfileConfig().format);
            }
        );

    sequenceCmd
        .command("update")
        .argument("<query>", "Sequence id or name to be overwritten")
        .argument("<package>", "The file to upload")
        .description("Update Sequence with given name")
        .action(
            async (query: string, sequencePackage: string) => {
                const sequenceClient = await sequenceSendPackage(sequencePackage, { name: query }, true);

                displayObject(sequenceClient, profileManager.getProfileConfig().format);
            }
        );

    sequenceCmd
        .command("start")
        .argument("<id>", "Sequence id to start or '-' for the last uploaded")
        // TODO: for future implementation
        // .option("--hub <provider>", "aws|ovh|gcp");
        .option("-f, --config-file <path-to-file>", "Path to configuration file in JSON format to be passed to the Instance context")
        .option("-s, --config-string <json-string>", "Configuration in JSON format to be passed to the Instance context")
        .option("--inst-id <string>", "Start Sequence with a custom Instance Id. Should consist of 36 characters")
        .option("--output-topic <string>", "Topic to which the output stream should be routed")
        .option("--input-topic <string>", "Topic to which the input stream should be routed")
        .option("--args <json-string>", "Arguments to be passed to the first function in the Sequence")
        .option("--limits <json-string>", "Instance limits")
        .description("Start the Sequence with or without given arguments")
        .action(async (id, { configFile, configString, outputTopic, inputTopic, args: argsStr, limits: limitsStr, instId }) => {
            let args;

            if (argsStr) args = sequenceParseArgs(argsStr);
            const limits = limitsStr ? JSON.parse(limitsStr) : {};

            const instanceClient = await sequenceStart(
                id, { configFile, configString, args, outputTopic, inputTopic, limits, instId });

            displayObject(instanceClient, profileManager.getProfileConfig().format);
        });

    type DeployArgs = {
        output: string;
        configFile: any;
        configString: string;
        instId?: string;
        args?: string;
    };

    sequenceCmd
        .command("deploy")
        .alias("run")
        .argument("<path>")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .option("-f, --config-file <path-to-file>", "Path to configuration file in JSON format to be passed to the Instance context")
        .option("-s, --config-string <json-string>", "Configuration in JSON format to be passed to the Instance context")
        .option("--inst-id <string>", "Start Sequence with a custom Instance Id. Should consist of 36 characters")
        // TODO: check if output-topic and input-topic should be added after development
        .option("--args <json-string>", "Arguments to be passed to the first function in the Sequence")
        .description("Pack (if needed), send and start the Sequence")
        .action(async (path: string, { output: fileoutput, configFile, configString, args: argsStr, instId }: DeployArgs) => {
            let args;

            if (argsStr) args = sequenceParseArgs(argsStr);

            const output = new PassThrough();

            if (fileoutput) {
                const outputPath = fileoutput ? resolve(fileoutput) : `${resolve(path)}.tar.gz`;

                output.pipe(createWriteStream(outputPath));
                sessionConfig.setLastPackagePath(outputPath);
            }
            const format = profileManager.getProfileConfig().format;

            if (lstatSync(path).isDirectory()) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                const sendSeqPromise = getHostClient().sendSequence(output).then(seq => {
                    sessionConfig.setLastSequenceId(seq.id);
                });

                await sequencePack(path, { output });
                await sendSeqPromise;
            } else {
                const sequenceClient = await sequenceSendPackage(path, {}, false, { progress: sequenceCmd.parent?.getOptionValue("progress") });

                displayObject(sequenceClient, profileManager.getProfileConfig().format);
            }

            const instanceClient = await sequenceStart("-", { configFile, configString, args, instId });

            displayObject(instanceClient, format);
        });

    sequenceCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
        .option("-f, --force", "Forcefully removes The Sequence by killing its Instances")
        .description("Removes the Sequence from the Hub")
        .action(async (id: string, { force }) => {
            await sequenceDelete(id, { force }).then(
                res => { displayObject(res, profileManager.getProfileConfig().format); },
                error => {
                    displayError(
                        JSON.parse(error?.body || { body: "Unknown error" })
                    );
                }
            );
        });

    sequenceCmd
        .command("prune")
        // .option("--all")
        // .option("--filter")
        .option("-f,--force", "Removes also active Sequences (with its running Instances)")
        .description("Remove all Sequences from the Hub (use with caution)")
        .action(async ({ force }) => {
            let seqs = await getHostClient().listSequences();
            const { lastSequenceId } = sessionConfig.get();

            if (!seqs.length) {
                displayMessage("Sequence list is empty, nothing to delete.");
                return;
            }

            let fullSuccess = true;

            await Promise.all(
                seqs.map(async seq => sequenceDelete(seq.id, { force }, lastSequenceId))
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
            sessionConfig.setLastInstanceId("");

            if (seqs.length) {
                throw new Error("Some Sequences may have not been deleted.");
            }

            displayMessage("Sequences removed successfully.");
        });
};
