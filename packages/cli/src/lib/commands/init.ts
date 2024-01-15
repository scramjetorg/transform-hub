import { Argument } from "commander";
import { spawnSync } from "child_process";
import { CommandDefinition, ExtendedHelpConfiguration } from "../../types";
import { CommandCompleterDetails, CompleterDetailsEvent } from "../../events/completerDetails";

export const init: CommandDefinition = (program) => {
    const initCmd = program
        .command("init")
        .addHelpCommand(false)
        .configureHelp({ showGlobalOptions: true, developersOnly: true } as ExtendedHelpConfiguration)
        .alias("i")
        .usage("[command] [options...]")
        .description("Create all the necessary files and start working on your Sequence");

    initCmd
        .command("sequence")
        .alias("seq")
        .addArgument(
            new Argument("[language]", "Choose the language to develop the sequence")
                .choices(["ts", "js", "py"])
                .default("js")
        )
        .addArgument(
            new Argument("[type]", "Choose transformation type of the sequence")
                .choices(["generator", "transformer", "consumer"])
                .default("transformer")
        )
        .option("-p, --path <dir-path>", "Path to create sequence")
        .description("Create all the necessary files and start working on your Sequence")
        .on(CompleterDetailsEvent, (complDetails: CommandCompleterDetails) => {
            complDetails.path = "dirnames";
        })
        .action(async (language: string, type: string, { path }) => {
            const args = `init scramjetorg/sequence ${language}-${type}`;

            spawnSync("npm", args.split(" "), { stdio: "inherit", cwd: path });
        });
};
