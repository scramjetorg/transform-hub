/* eslint-disable no-console */
import { SequenceClient } from "@scramjet/api-client";
import { GetSequenceResponse } from "@scramjet/types/src/rest-api-sth";
import { defer } from "@scramjet/utility";
import { createWriteStream, lstatSync } from "fs";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { PassThrough } from "stream";
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { getHostClient, getInstance, getReadStreamFromFile, packAction } from "../common";
import { getPackagePath, getSequenceId, sessionConfig } from "../config";
import { displayEntity, displayError, displayMessage, displayObject } from "../output";

const sendPackage = async (sequencePackage: string) => {
    try {
        const sequencePath = getPackagePath(sequencePackage);
        const seq = await getHostClient().sendSequence(
            await getReadStreamFromFile(sequencePath)
        );

        sessionConfig.setLastSequenceId(seq.id);

        return displayObject(seq);
    } catch (e: any) {
        return displayError(e);
    }
};

const startSequence = async (id: string, { configFile, configString, args, outputTopic, inputTopic }:
    { configFile: any, configString: string, args?: any[], outputTopic?: string, inputTopic?: string }) => {
    if (configFile && configString) {
        console.error("Provide one source of configuration");
        return Promise.resolve();
    }
    let appConfig = {};

    try {
        if (configString) appConfig = JSON.parse(configString);
        if (configFile) appConfig = JSON.parse(await readFile(configFile, "utf-8"));
    } catch (_) {
        console.error("Unable to read configuration");
        return Promise.reject();
    }
    const sequenceClient = SequenceClient.from(getSequenceId(id), getHostClient());

    try {
        const instance = await sequenceClient.start({ appConfig, args, outputTopic, inputTopic });

        sessionConfig.setLastInstanceId(instance.id);
        return displayObject(instance);
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
        .action(async () => displayEntity(getHostClient().listSequences()));

    sequenceCmd
        .command("pack")
        .argument("<path>")
        .option("-c, --stdout", "Output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .description("Create archived file (package) with the Sequence for later use")
        .action((path, { stdout, output: fileoutput }) => {
            const outputPath = fileoutput ? resolve(fileoutput) : resolve(path);
            const output = stdout ? new PassThrough() : createWriteStream(outputPath);

            return packAction(path, { output });
        });

    const waitForInstanceKills = async (seq: GetSequenceResponse, timeout: number) => {
        const ts = Date.now();

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { instances } = await getHostClient().getSequence(seq.id);

            await defer(500);

            if (!instances.length) break;

            if (Date.now() - ts > timeout) {
                throw new Error();
            }
        }
    };

    const killAllSequenceInstances = async (seq: GetSequenceResponse, lastInstanceId: string) => {
        displayMessage(`Killing instances of the Sequence ${seq.id}`);
        await Promise.all(
            seq.instances.map(async (id) => {
                if (lastInstanceId === id)
                    sessionConfig.setLastInstanceId("");

                return getInstance(id).kill();
            })
        ).catch(() => {
            throw new Error(`Could not kill all instances of the Sequence ${seq.id}`);
        });
    };

    sequenceCmd
        .command("send")
        .argument("<package>", "The file to upload or '-' to use the last packed")
        .description("Send the Sequence package to the Hub")
        .action(async (sequencePackage: string) => sendPackage(sequencePackage));

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
        .description("Start the Sequence with or without given arguments")
        .action(async (id, { configFile, configString, outputTopic, inputTopic, args: argsStr }) => {
            const args = parseSequenceArgs(argsStr);

            await startSequence(id, { configFile, configString, args, outputTopic, inputTopic });
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
                const outputPath = resolve(process.cwd(), fileoutput);

                output.pipe(createWriteStream(outputPath));
                sessionConfig.setLastPackagePath(outputPath);
            }

            if (lstatSync(path).isDirectory()) {
                await packAction(path, { output });
                console.error("Packed!");
                const seq = await getHostClient().sendSequence(output);

                sessionConfig.setLastSequenceId(seq.id);
            } else
                await sendPackage(path);
            const args = parseSequenceArgs(argsStr);

            await startSequence("-", { configFile, configString, args });
        });

    sequenceCmd
        .command("get")
        .argument("<id>", "Sequence id to start or '-' for the last uploaded")
        .description("Obtain a basic information about the Sequence")
        .action(async (id: string) => displayEntity(getHostClient().getSequence(getSequenceId(id))));

    sequenceCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
        .description("Delete the Sequence from the Hub")
        .action(async (id: string) => displayEntity(getHostClient().deleteSequence(getSequenceId(id))));

    sequenceCmd
        .command("prune")
        // .option("--all")
        // .option("--filter")
        .option("-f,--force", "Removes also active Sequences (with its running Instances)")
        .description("Remove all Sequences from the current scope (use with caution)")

        .action(async ({ force }) => {
            const seqs = await getHostClient().listSequences();
            const { lastSequenceId, lastInstanceId } = sessionConfig.getConfig();
            const timeout = 10e3;
            let fullSuccess = true;

            for (const seq of seqs) {
                try {
                    if (seq.instances.length) {
                        if (!force) {
                            displayMessage(`Sequence ${seq.id} has running Instances, use --force to kill those.`);
                            continue;
                        }
                        await killAllSequenceInstances(seq, lastInstanceId);
                        await waitForInstanceKills(seq, timeout);
                    }

                    await getHostClient().deleteSequence(seq.id);

                    if (lastSequenceId === seq.id) sessionConfig.setLastSequenceId("");
                } catch (e: any) {
                    fullSuccess = false;

                    displayMessage(`WARN: Could not delete Sequence ${seq.id}`);
                    if (isDevelopment())
                        displayMessage("error stack", e?.stack);
                    displayMessage("Please try to run 'si seq prune -f' again to remove all Sequences.");
                }

                if (!fullSuccess)
                    throw new Error("Some Sequences may have not been deleted.");
            }
            displayMessage("Sequences removed successfully.");
        })
    ;
};
