import { CommandDefinition } from "../../types";
import { globalConfig } from "../config";
import { displayObject } from "../output";

/**
 * Initializes `config` command.
 *
 * @param {Command} program Commander object.
 */
export const config: CommandDefinition = (program) => {
    const globalConf = globalConfig.getConfig();
    const { apiUrl, middlewareApiUrl, env } = globalConfig.getDefaultConfig();

    const configCmd = program
        .command("config")
        .alias("c")
        .usage("si config [subcommand] ")
        .description("config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings");

    /**
     * Command: `si config print`
     * Log: configVersion, apiUrl, logLevel, format
     * {@link GlobalConfigEntity}
     */
    configCmd
        .command("print")
        .alias("p")
        .description("Print out the current config")
        .action(() => displayObject(program, globalConf));

    configCmd
        .command("set")
        .option("--json <json>", "set config from json object")
        .option("--apiUrl <url>", `specify the hub API url (default: "${apiUrl}")`)
        .option("--middlewareApiUrl <url>", `specify middleware API url (default: "${middlewareApiUrl}")`)
        .option("--scope <name>", "specify default scope that should be used when session start")
        .option("--env <production|develop>", `specify the environment (default: ${env})`)
        .description("use an option to set the values in config")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    configCmd
        .command("reset")
        .option("--apiUrl")
        .option("--middlewareApiUrl")
        .option("--env")
        .option("--all")
        .description("reset config value to default")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me unset");
        });

    // TODO: cleanup
    /**
     * Command: `si config apiUrl`
     * Default `apiUrl`: {@link defaultConfig.apiUrl}
     * Log: configVersion, apiUrl, logLevel, format
     */
    // configCmd
    //     .command("apiUrl <apiUrl>")
    //     .description("Set the hub API url")
    //     .action((value) => globalConfig.setApiUrl(value) as unknown as void);

    // /**
    //  * Command: `si config format`
    //  * Default `format`: {@link defaultConfig.format}
    //  */
    // configCmd
    //     .command("logLevel <logLevel>")
    //     .description("Set the hub API url")
    //     .action((value) => globalConfig.setLog(value) as unknown as void);

    // configCmd
    //     .command("set <key> <value>")
    //     .description("Set config value")
    //     .action((key, value) => globalConfig.setConfigValue(key, value) as void);

    // configCmd
    //     .command("get <key>")
    //     .description("Get config value")
    //     .action((key: keyof GlobalConfigEntity) => {
    //         return displayObject(program, globalConfig.getConfig()[key]);
    //     });

    // configCmd
    //     .command("unset <key>")
    //     .alias("del")
    //     .description("Unset config value")
    //     .action((key) => globalConfig.delConfigValue(key) as unknown as void);
};
