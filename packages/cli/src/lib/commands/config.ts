import { CommandDefinition } from "../../types";
import { getConfig, setConfigValue } from "../config";
import { displayObject } from "../output";

export const config: CommandDefinition = (program) => {
    /**
     * Set custom value for config and write it to JSON file.
    */
    const configCmd = program
        .command("config [command]")
        .alias("c")
        .description("configuration file operations");

    /**
    * Command: `si config print`
    * Log: configVersion, apiUrl, logLevel, format
    * {@link defaultConfig}
    */
    configCmd.command("print")
        .alias("p")
        .description("print out the current config")
        .action(() => displayObject(program, getConfig()));

    /**
     * Command: `si config apiUrl`
     * Default `apiUrl`: {@link defaultConfig.apiUrl}
     * Log: configVersion, apiUrl, logLevel, format
     */
    configCmd.command("apiUrl <apiUrl>")
        .description("set the hub API url")
        .action((value) => setConfigValue("apiUrl", value));

    /**
     * Command: `si config format`
     * Default `format`: {@link defaultConfig.format}
     */
    configCmd.command("logLevel <logLevel>")
        .description("set the hub API url")
        .action((value) => setConfigValue("log", value));
};
