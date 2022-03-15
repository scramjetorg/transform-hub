import { CommandDefinition, GlobalConfigEntity } from "../../types";
import { globalConfig, sessionConfig } from "../config";
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
    const configCmd = program.command("config").alias("c").description("configuration file operations");

    /**
     * Command: `si config print`
     * Log: configVersion, apiUrl, logLevel, format
     * {@link defaultConfig}
     */
    configCmd
        .command("print")
        .alias("p")
        .description("Print out the current config")
        .action(() => displayObject(program, { ...sessionConfig.getConfig(), ...globalConfig.getConfig() }));

    /**
     * Command: `si config apiUrl`
     * Default `apiUrl`: {@link defaultConfig.apiUrl}
     * Log: configVersion, apiUrl, logLevel, format
     */
    configCmd
        .command("apiUrl <apiUrl>")
        .description("Set the hub API url")
        .action((value) => globalConfig.setApiUrl(value) as unknown as void);

    /**
     * Command: `si config format`
     * Default `format`: {@link defaultConfig.format}
     */
    configCmd
        .command("logLevel <logLevel>")
        .description("Set the hub API url")
        .action((value) => globalConfig.setLog(value) as unknown as void);

    configCmd
        .command("set <key> <value>")
        .description("Set config value")
        .action((key, value) => globalConfig.setConfigValue(key, value) as void);

    configCmd
        .command("get <key>")
        .description("Get config value")
        .action((key: keyof GlobalConfigEntity) => {
            return displayObject(program, globalConfig.getConfig()[key]);
        });

    configCmd
        .command("unset <key>")
        .alias("del")
        .description("Unset config value")
        .action((key) => globalConfig.delConfigValue(key) as unknown as void);
};
