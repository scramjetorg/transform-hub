import { CommandDefinition } from "../../types";
import { stringToBoolean } from "../../utils/stringToBoolean";
import { globalConfig, sessionConfig } from "../config";
import { displayObject } from "../output";

/**
 * Initializes `config` command.
 *
 * @param {Command} program Commander object.
 */
export const config: CommandDefinition = (program) => {
    const defaultConfig = globalConfig.getDefaultConfig();
    const { apiUrl: defaultApiUrl,
        middlewareApiUrl: defaulMiddlewareApiUrl,
        env: defaultEnv,
        token: defaultToken,
        debug: defaultDebug,
        format: defaultFormat } = defaultConfig;

    const configCmd = program
        .command("config")
        .alias("c")
        .usage("si config [command] ")
        .description("config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings");

    configCmd
        .command("print")
        .alias("p")
        .description("Print out the current config")
        .action(() => displayObject(globalConfig.getConfig()));

    const useCmd = configCmd
        .command("use")
        .description("add properties to session config");

    useCmd
        .command("apiUrl")
        .argument("<url>")
        .description(`specify the hub API url (current: ${sessionConfig.getConfig().apiUrl})`)
        .action(url => sessionConfig.setApiUrl(url) as unknown as void);

    const setCmd = configCmd
        .command("set")
        .description("add properties to global config ");

    setCmd
        .command("json")
        .argument("<json>")
        .description("set config properties from json object")
        .action(json => {
            try {
                if (!globalConfig.setConfig(JSON.parse(json))) {
                    // eslint-disable-next-line no-console
                    console.error("Invalid configuration in json object");
                }
            } catch (_) {
                // eslint-disable-next-line no-console
                console.error("Parsing error: Invalid JSON format");
            }
        });

    setCmd
        .command("apiUrl")
        .argument("<url>")
        .description(`specify the Hub API Url (default: ${defaultApiUrl})`)
        .action(url => {
            if (!globalConfig.setApiUrl(url)) {
                // eslint-disable-next-line no-console
                console.error("Invalid url");
            }
        });

    setCmd
        .command("log")
        .option("--debug <boolean>", `specify log to show extended view (default: ${defaultDebug})`)
        .option("--format <format>", `specify format between "pretty" or "json" (default: ${defaultFormat})`)
        .description("specify log options")
        .action(({ debug, format }) => {
            if (debug) {
                const debugVal = stringToBoolean(debug);

                if (typeof debugVal === "undefined") {
                    // eslint-disable-next-line no-console
                    console.error("Invalid debug value");
                }
                if (!globalConfig.setDebug(debugVal as boolean)) {
                    // eslint-disable-next-line no-console
                    console.error("Unable to set debug value");
                }
            }
            if (format && !globalConfig.setFormat(format)) {
                // eslint-disable-next-line no-console
                console.error("Unable to set format value");
            }
        });

    setCmd
        .command("middlewareApiUrl")
        .argument("<url>")
        .description(`specify middleware API url ${defaulMiddlewareApiUrl}`)
        .action(url => {
            if (!globalConfig.setMiddlewareApiUrl(url)) {
                // eslint-disable-next-line no-console
                console.error("Invalid url");
            }
        });

    setCmd
        .command("scope")
        .argument("<name>")
        .description("specify default scope that should be used when session start")
        .action(scope => {
            if (!globalConfig.setScope(scope)) {
                // eslint-disable-next-line no-console
                console.error(`Invalid name: ${scope}`);
            }
        });

    setCmd
        .command("token")
        .argument("<jwt>")
        .description(`specify platform authorization token (default: ${defaultToken})`)
        .action(token => {
            if (!globalConfig.setToken(token)) {
                // eslint-disable-next-line no-console
                console.error("Invalid token");
            }
        });

    setCmd
        .command("env")
        .argument("<production|develop>")
        .description(`specify the environment (default: ${defaultEnv})`)
        .action(env => {
            if (!globalConfig.setEnv(env)) {
                // eslint-disable-next-line no-console
                console.error("Invalid environment");
            }
        });

    const resetCmd = configCmd.command("reset").description("reset configuration value to default");

    const resetValue = (defaultValue: any, setCallback: (val: typeof defaultValue) => boolean) => {
        if (!setCallback(defaultValue)) {
            // eslint-disable-next-line no-console
            console.error("Reset failed.");
        }
    };

    resetCmd
        .command("apiUrl")
        .description("reset apiUrl")
        .action(() => resetValue(defaultApiUrl, v => globalConfig.setApiUrl(v)));

    resetCmd
        .command("log")
        .description("reset logger")
        .action(() => resetValue({ defaultFormat, defaultDebug },
            ({ defaultFormat: f, defaultDebug: d }) => globalConfig.setFormat(f) && globalConfig.setDebug(d)));

    resetCmd
        .command("middlewareApiUrl")
        .description("reset middlewareApiUrl")
        .action(() => resetValue(defaulMiddlewareApiUrl, v => globalConfig.setMiddlewareApiUrl(v)));

    //TODO: think how we want to reset scope throughout the program

    resetCmd
        .command("token")
        .description("reset token")
        .action(() => resetValue(defaultToken, v => globalConfig.setToken(v)));

    resetCmd
        .command("env")
        .description("reset env")
        .action(() => resetValue(defaultEnv, v => globalConfig.setEnv(v)));

    resetCmd
        .command("all")
        .description("reset all configuration")
        .action(() => resetValue(defaultConfig, v => globalConfig.setConfig(v)));
};
