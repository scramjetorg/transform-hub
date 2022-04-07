import { prettyPrint } from "@scramjet/obj-logger";
import { StringStream } from "scramjet";
import { CommandDefinition } from "../../types";
import { displayStream } from "../output";

/**
 * Initializes `config` command.
 *
 * @param {Command} program Commander object.
 */
export const util: CommandDefinition = (program) => {
    /**
     * Set custom value for config and write it to JSON file.
     */
    const configCmd = program.command("util").alias("u").description("various utilities");

    /**
     * Command: `si config print`
     * Log: configVersion, apiUrl, logLevel, format
     * {@link defaultConfig}
     */
    configCmd
        .command("log-format")
        .addHelpCommand(false)
        .alias("lf")
        .option("--no-color", "dont colorize the values")
        .description("colorifies and prints out nice colorful log files")
        .action(({ color }) => {
            const parser = prettyPrint({ colors: color });

            const out = StringStream.from(process.stdin)
                .lines()
                .parse(x => {
                    try {
                        return JSON.parse(x);
                    } catch {
                        return undefined;
                    }
                })
                .stringify(parser);

            return displayStream(out);
        });
};
