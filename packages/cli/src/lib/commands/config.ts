import { CommandDefinition } from "../../types";
import { delConfigValue, getConfig, setConfigValue } from "../config";
import { displayObject } from "../output";

/**
 * Initializes `config` command.
 *
 * @param {Command} program Commander object.
 */
export const config: CommandDefinition = (program) => {
    /**
     * Set custom value for config and write it to JSON file.
    */
    const configCmd = program
        .command("config")
        .alias("c")
        .description("configuration file operations");

    /**
    * Command: `si config print`
    * Log: configVersion, apiUrl, logLevel, format
    * {@link defaultConfig}
    */
    configCmd.command("print")
        .alias("p")
        .description("Print out the current config")
        .action(() => displayObject(program, getConfig()));

    /**
     * Command: `si config apiUrl`
     * Default `apiUrl`: {@link defaultConfig.apiUrl}
     * Log: configVersion, apiUrl, logLevel, format
     */
    configCmd.command("apiUrl <apiUrl>")
        .description("Set the hub API url")
        .action((value) => setConfigValue("apiUrl", value));

    /**
     * Command: `si config format`
     * Default `format`: {@link defaultConfig.format}
     */
    configCmd.command("logLevel <logLevel>")
        .description("Set the hub API url")
        .action((value) => setConfigValue("log", value));

    configCmd.command("set <key> <value>")
        .description("Set config value")
        .action((key, value) => setConfigValue(key, value));

    configCmd.command("get <key>")
        .description("Get config value")
        .action((key: keyof ReturnType<typeof getConfig>) => {
            console.log(getConfig()[key]);
        });

    configCmd.command("unset <key>")
        .alias("del")
        .description("Unset config value")
        .action((key) => delConfigValue(key));
};
