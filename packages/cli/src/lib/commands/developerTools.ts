import { createWriteStream } from "fs";
import { PassThrough } from "stream";
import { CommandDefinition, ExtendedHelpConfiguration } from "../../types";
import { profileManager } from "../config";
import { cmdToJson, cmdToList, cmdToMd, rootCommand } from "../helpers/developerTools";
import { displayObject, displayStream } from "../output";
import { CommandCompleterDetails, CompleterDetailsEvent } from "../../events/completerDetails";

/**
 * Initializes `developerTools` command.
 *
 * @param {Command} program Commander object.
 */
export const developerTools: CommandDefinition = (program) => {
    const developerToolsCmd = program
        .command("developerTools")
        .alias("dev")
        .addHelpCommand(false)
        .configureHelp({ showGlobalOptions: true, developersOnly: true } as ExtendedHelpConfiguration)
        .usage("[command] [options...]")
        .description("Developer tools");

    const cmdToFormat = async (formatCb: Function, output: string) => {
        const stream = output ? createWriteStream(output) : new PassThrough();
        const rootCmd = rootCommand(program);

        formatCb(rootCmd, stream);
        stream.end();

        if (!output)
            await displayStream(stream);
    };

    developerToolsCmd
        .command("cmdToJson")
        .description("Lists all commands structure in JSON format")
        .option("-o, --output <fileName>", "Output to file instead of stdout")
        .on(CompleterDetailsEvent, (complDetails: CommandCompleterDetails)=>{
            complDetails.output = "filenames";
        })
        .action(async ({ output }) => {
            const rootCmd = rootCommand(program);
            const cmdJson = cmdToJson(rootCmd);

            if (output) {
                createWriteStream(output).write(JSON.stringify(cmdJson, null, 2));
            } else
                displayObject(cmdJson, profileManager.getProfileConfig().format);
        });

    developerToolsCmd
        .command("cmdToList")
        .description("Lists all commands in CLI as string list")
        .option("-o, --output <fileName>", "Output to file instead of stdout")
        .on(CompleterDetailsEvent, (complDetails: CommandCompleterDetails)=>{
            complDetails.output = "filenames";
        })
        .action(async ({ output }) => await cmdToFormat(cmdToList, output));

    developerToolsCmd
        .command("cmdToMd")
        .option("-o, --output <fileName>", "Output to file instead of stdout")
        .description("Lists all commands in Markdown format")
        .on(CompleterDetailsEvent, (complDetails: CommandCompleterDetails)=>{
            complDetails.output = "filenames";
        })
        .action(async ({ output }) => await cmdToFormat(cmdToMd, output));
};
