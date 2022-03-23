import { CommandDefinition } from "../../types";
import { globalConfig } from "../config";
import { displayObject } from "../output";
import { globalConfigFile, simplyfyPath } from "../paths";

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
        // FIXME: Do we realy want to show path to global config?
        .description(`Config contains global information. It is located under ${simplyfyPath(globalConfigFile)}`);
    // FIXME: which description should we leave?
    // .description("operations on configuration file");

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

    const setCommand = configCmd
        .command("set")
        .argument("<pathToFile|{json}>")
        .description("set config from file or pass json object")
        .action(() => {
            // TODO: implement me
            // FIXME: what is expected behaviour of pathToFile- use this path or copy to global config?
            throw new Error("Implement me");
        });

    setCommand
        .command("apiUrl")
        // FIXME: argument should be apiUrl or url?
        .argument("<apiUrl>")
        .description(`specify the hub API url (default: "${apiUrl}")`)
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    setCommand
        .command("middlewareApiUrl")
        // FIXME: mixed style? why here middlewareApiUrl->url and with apiUrl->apiUrl
        .argument("<url>")
        .description(`specify middleware API url (default: "${middlewareApiUrl}")`)
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    setCommand
        .command("scope")
        .argument("<name>")
        .description("specify default scope that should be used when session start")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    setCommand
        .command("env")
        .argument("<production|develop>")
        //FIXME: missing quotes on env?
        .description(`specify the environment (default: ${env})`)
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });

    configCmd
        .command("unset")
        // FIXME: not sure if del is proper name for logic behind (since we reset to default)
        .alias("del")
        .argument("<apiUrl|middlewareApiUrl>")
        .description("unset config value")
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
