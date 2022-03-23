import { SequenceClient } from "@scramjet/api-client";
import { lstatSync } from "fs";
import { readFile } from "fs/promises";
import { CommandDefinition } from "../../types";
import { isDevelopment } from "../../utils/isDevelopment";
import { getHostClient, getReadStreamFromFile, packAction } from "../common";
import { getPackagePath, getSequenceId, sessionConfig } from "../config";
import { displayEntity, displayObject } from "../output";

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
        .usage("si seq [command] [options...]")
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
        // TODO: for future implementation
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
        .argument("<id>", "the sequence id to start or '-' for the last uploaded.")
        .description("obtain basic information about a sequence")
        .action(async (id: string) => displayEntity(getHostClient().getSequence(getSequenceId(id))));

    sequenceCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "the sequence id to remove or '-' for the last uploaded.")
        .description("delete the sequence form Hub")
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
