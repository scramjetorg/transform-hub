import { CommandDefinition, displayFormat } from "../../types";
import { createWriteStream, lstatSync } from "fs";
import { defer, promiseTimeout } from "@scramjet/utility";
import { displayEntity, displayError, displayMessage, displayObject } from "../output";
import { getHostClient, getInstance, getReadStreamFromFile, packAction } from "../common";
import { getPackagePath, getSequenceId, profileConfig, sessionConfig } from "../config";

import { GetSequenceResponse } from "@scramjet/types/src/rest-api-sth";
import { InstanceLimits } from "@scramjet/types";
import { PassThrough } from "stream";

import { SequenceClient } from "@scramjet/api-client";
import { isDevelopment } from "../../utils/envs";
import { readFile, lstat } from "fs/promises";
import { resolve } from "path";

type SequenceUploadOptions = {
    name?: string;
}

const sendPackage = async (
    sequencePackage: string, options: SequenceUploadOptions = {}, format: displayFormat, update = false
) => {
    try {
        const id = getSequenceId(options.name!);

        let sequencePath = getPackagePath(sequencePackage);

        if ((await lstat(sequencePath)).isDirectory()) {
            await packAction(sequencePackage, { output: createWriteStream(`${sequencePackage}.tar.gz`) });
            sequencePath = `${sequencePackage}.tar.gz`;
        }

        let seq: SequenceClient;

        if (update) {
            seq = await getHostClient().getSequenceClient(id)?.overwrite(
                await getReadStreamFromFile(sequencePath),
            );
        } else {
            const headers: HeadersInit = {};

            if (options.name) {
                headers["x-name"] = options.name;
            }

            seq = await getHostClient().sendSequence(
                await getReadStreamFromFile(sequencePath),
                {
                    headers
                }
            );
        }

        sessionConfig.setLastSequenceId(seq.id);

        return displayObject(seq, format);
    } catch (e: any) {
        return displayError(e);
    }
};

const startSequence = async (
    id: string, { configFile, configString, args, outputTopic, inputTopic, limits }:
        {
            configFile: any,
            configString: string,
            args?: any[],
            outputTopic?: string,
            inputTopic?: string,
            limits?: InstanceLimits
        }
    , format: displayFormat
) => {
    if (configFile && configString) {
        displayError("Provide one source of configuration");
        return Promise.resolve();
    }

    let appConfig = {};

    try {
        if (configString) appConfig = JSON.parse(configString);
        if (configFile) appConfig = JSON.parse(await readFile(configFile, "utf-8"));
    } catch (_) {
        displayError("Unable to read configuration");
        return Promise.reject();
    }
    const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient());

    try {
        const instance = await sequenceClient.start({ appConfig, args, outputTopic, inputTopic, limits });

        sessionConfig.setLastInstanceId(instance.id);
        return displayObject(instance, format);
    } catch (error: any) {
        displayError(error);
        return process.exit(1);
    }
};

function parseSequenceArgs(argsStr: string | undefined): any[] {
    try {
        return argsStr ? JSON.parse(argsStr) : [];
    } catch (err) {
        throw new Error(`Error while parsing the provided Instance arguments. '${(err as Error).message}'`);
    }
}

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

            return packAction(path, { output });
        });

    const waitForInstanceKills = (seq: GetSequenceResponse, timeout: number) => {
        return promiseTimeout((async () => {
            let l;

            // eslint-disable-next-line no-cond-assign
            while (l = (await getHostClient().getSequence(seq.id)).instances.length) {
                displayMessage(`Sequence ${seq.id}. Waiting for ${l} instance${l > 1 ? "s" : ""} to finish...`);
                await defer(1000);
            }
            return Promise.resolve();
        })(), timeout);
    };

    sequenceCmd
        .command("send")
        .argument("<package>", "The file or directory to upload or '-' to use the last packed. If directory, it will be packed and send.")
        .option("--name <name>", "Allows to name sequence")
        .description("Send the Sequence package to the Hub")
        .action(
            async (sequencePackage: string, { name }) => sendPackage(sequencePackage, { name }, profileConfig.format)
        );

    sequenceCmd
        .command("update")
        .argument("<query>", "Sequence id or name to be overwritten")
        .argument("<package>", "The file to upload")
        .description("Updates sequence with given name")
        .action(
            async (query: string, sequencePackage: string) =>
                sendPackage(sequencePackage, { name: query }, profileConfig.format, true)
        );

    sequenceCmd
        .command("use")
        .alias("select")
        .description("Select the Sequence to communicate with by using '-' alias instead of Sequence id")
        .addHelpText("after", `\nCurrent Sequence id saved under '-' : ${sessionConfig.getConfig().lastSequenceId}`)
        .argument("<id>", "Sequence id")
        .action(async (id: string) => sessionConfig.setLastSequenceId(id) as unknown as void);

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
            const args = parseSequenceArgs(argsStr);
            const limits = limitsStr ? JSON.parse(limitsStr) : {};

            await startSequence(id, { configFile, configString, args, outputTopic, inputTopic, limits },
                profileConfig.format);
        });

    type DeployArgs = {
        output: string;
        configFile: any;
        configString: string;
        args: string;
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

                await packAction(path, { output });
                await sendSeqPromise;
            } else {
                await sendPackage(path, {}, format);
            }

            const args = parseSequenceArgs(argsStr);

            await startSequence("-", { configFile, configString, args }, format);
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
        .action(async (id: string) => displayEntity(getHostClient().deleteSequence(getSequenceId(id)),
            profileConfig.format));

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
                            displayMessage(`Sequence ${seq.id} has running instances. Use --force to kill those.`);
                            return Promise.resolve();
                        }

                        if (force) {
                            await Promise.all(
                                seq.instances.map(async instanceId => {
                                    if (lastInstanceId === instanceId) {
                                        sessionConfig.setLastInstanceId("");
                                    }

                                    return getInstance(instanceId).kill({ removeImmediately: true });
                                })
                            );

                            displayMessage(`KILL requested for Instances of Sequence ${seq.id}. Waiting...`);

                            await defer(15000);
                            await waitForInstanceKills(seq, timeout);
                        }
                    }

                    return getHostClient().deleteSequence(seq.id).then(() => {
                        if (lastSequenceId === seq.id) {
                            sessionConfig.setLastSequenceId("");
                        }
                    });
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

            if (!seqs.length) {
                displayMessage("Sequences removed successfully.");
            } else {
                displayMessage("Some Sequences may have not been deleted.");
            }
        });
};
