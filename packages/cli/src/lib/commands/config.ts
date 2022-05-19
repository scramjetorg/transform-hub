/* eslint-disable no-console */

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
        .addHelpCommand(false)
        .alias("c")
        .usage("[command] ")
        .description("Config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings");

    configCmd
        .command("print")
        .alias("p")
        .description("Print out the current configuration")
        .action(() => displayObject(globalConfig.getConfig()));

    const useCmd = configCmd
        .command("use")
        .addHelpCommand(false)
        .description("Add properties to the session configuration");

    useCmd
        .command("apiUrl")
        .argument("<url>")
        .description(`Specify the Hub API url (current: ${sessionConfig.getConfig().apiUrl})`)
        .action(url => sessionConfig.setApiUrl(url) as unknown as void);

    const setCmd = configCmd
        .command("set")
        .addHelpCommand(false)
        .description("Add properties to the global config ");

    setCmd
        .command("json")
        .argument("<json>")
        .description("Set configuration properties from a json object")
        .action(json => {
            try {
                if (!globalConfig.setConfig(JSON.parse(json))) {
                    console.error("Invalid configuration in json object");
                }
            } catch (_) {
                console.error("Parsing error: Invalid JSON format");
            }
        });

    setCmd
        .command("apiUrl")
        .argument("<url>")
        .description(`Specify the Hub API Url (default: ${defaultApiUrl})`)
        .action(url => {
            if (!globalConfig.setApiUrl(url)) {
                console.error("Invalid url");
            }
        });

    setCmd
        .command("log")
        .option("--debug <boolean>", `Specify log to show extended view (default: ${defaultDebug})`)
        .option("--format <format>", `Specify format between "pretty" or "json" (default: ${defaultFormat})`)
        .description("Specify log options")
        .action(({ debug, format }) => {
            if (debug) {
                const debugVal = stringToBoolean(debug);

                if (typeof debugVal === "undefined") {
                    console.error("Invalid debug value");
                }
                if (!globalConfig.setDebug(debugVal as boolean)) {
                    console.error("Unable to set debug value");
                }
            }
            if (format && !globalConfig.setFormat(format)) {
                console.error("Unable to set format value");
            }
        });

    setCmd
        .command("middlewareApiUrl")
        .argument("<url>")
        .description(`Specify middleware API url ${defaulMiddlewareApiUrl}`)
        .action(url => {
            if (!globalConfig.setMiddlewareApiUrl(url)) {
                console.error("Invalid url");
            }
        });

    setCmd
        .command("scope")
        .argument("<name>")
        .description("Specify default scope that should be used when session start")
        .action(scope => {
            if (!globalConfig.setScope(scope)) {
                console.error(`Invalid name: ${scope}`);
            }
        });

    setCmd
        .command("token")
        .argument("<jwt>")
        .description(`Specify platform authorization token (default: ${defaultToken})`)
        .action(token => {
            if (!globalConfig.setToken(token)) {
                console.error("Invalid token");
            }
        });

    setCmd
        .command("env")
        .argument("<production|develop>")
        .description(`Specify the environment (default: ${defaultEnv})`)
        .action(env => {
            if (!globalConfig.setEnv(env)) {
                console.error("Invalid environment");
            }
        });

    const resetCmd = configCmd
        .command("reset")
        .addHelpCommand(false)
        .description("Reset configuration value to default");

    const resetValue = (defaultValue: any, setCallback: (val: typeof defaultValue) => boolean) => {
        if (!setCallback(defaultValue)) {
            console.error("Reset failed.");
        }
    };

    resetCmd
        .command("apiUrl")
        .description("Reset apiUrl")
        .action(() => resetValue(defaultApiUrl, v => globalConfig.setApiUrl(v)));

    resetCmd
        .command("log")
        .description("Reset logger")
        .action(() => resetValue({ defaultFormat, defaultDebug },
            ({ defaultFormat: f, defaultDebug: d }) => globalConfig.setFormat(f) && globalConfig.setDebug(d)));

    resetCmd
        .command("middlewareApiUrl")
        .description("Reset middlewareApiUrl")
        .action(() => resetValue(defaulMiddlewareApiUrl, v => globalConfig.setMiddlewareApiUrl(v)));

    resetCmd
        .command("token")
        .description("Reset token")
        .action(() => resetValue(defaultToken, v => globalConfig.setToken(v)));

    resetCmd
        .command("env")
        .description("Reset env")
        .action(() => resetValue(defaultEnv, v => globalConfig.setEnv(v)));

    resetCmd
        .command("all")
        .description("Reset all configuration")
        .action(() => resetValue(defaultConfig, v => globalConfig.setConfig(v)));
};
