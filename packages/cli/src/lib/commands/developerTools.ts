import { createWriteStream } from "fs";
import { PassThrough } from "stream";
import { cmd, type CommandDescriptor } from "@scramjet/config";
import { profileManager } from "../config";
import { cmdToList, cmdToMd, rootCommand } from "../helpers/developerTools";
import { displayObject, displayStream } from "../output";

const cmdToFormat = async (formatCb: Function, rootCmd: CommandDescriptor, output: string) => {
    const stream = output ? createWriteStream(output) : new PassThrough();

    formatCb(rootCmd, stream);
    stream.end();

    if (!output)
        await displayStream(stream);
};

/**
 * Builds the `developerTools` command descriptor tree.
 */
export const developerToolsCommand: CommandDescriptor = cmd("developerTools", (b) => {
    b
        .alias("dev")
        .usage("[command] [options...]")
        .meta("developersOnly", true)
        .desc("Developer tools")
        .children(
            cmd("cmdToJson", (c) => {
                c
                    .desc("Lists all commands structure in JSON format")
                    .option("-o, --output <fileName>", "Output to file instead of stdout")
                    .completer({ output: "filenames" })
                    .action(async (options: Record<string, unknown>) => {
                        const output = options.output as string;
                        const rootCmd = rootCommand(b.build());

                        if (output) {
                            createWriteStream(output).write(JSON.stringify(rootCmd, null, 2));
                        } else
                            displayObject(rootCmd, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("cmdToList", (c) => {
                c
                    .desc("Lists all commands in CLI as string list")
                    .option("-o, --output <fileName>", "Output to file instead of stdout")
                    .completer({ output: "filenames" })
                    .action(async (options: Record<string, unknown>) => {
                        const output = options.output as string;
                        const rootCmd = rootCommand(b.build());

                        await cmdToFormat(cmdToList, rootCmd, output);
                    });
            }),
            cmd("cmdToMd", (c) => {
                c
                    .option("-o, --output <fileName>", "Output to file instead of stdout")
                    .desc("Lists all commands in Markdown format")
                    .completer({ output: "filenames" })
                    .action(async (options: Record<string, unknown>) => {
                        const output = options.output as string;
                        const rootCmd = rootCommand(b.build());

                        await cmdToFormat(cmdToMd, rootCmd, output);
                    });
            })
        );
});
