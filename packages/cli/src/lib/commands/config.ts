/* eslint-disable no-console */

import { CommandDefinition, displayFormat } from "../../types";
import { stringToBoolean } from "../../utils/stringToBoolean";
import { ProfileConfig, profileConfig, profileManager, siConfig, sessionConfig } from "../config";
import { displayMessage, displayObject } from "../output";
import commander from "commander";
import { defaultConfigName, listDirFileNames, profileExists, profileNameToPath, profileRemove, profilesDir } from "../paths";

/**
 * Initializes `config` command.
 *
 * @param {Command} program Commander object.
 */
export const config: CommandDefinition = (program) => {
    const defaultConfig = profileConfig.getDefaultConfig();

    const { apiUrl: defaultApiUrl,
        middlewareApiUrl: defaulMiddlewareApiUrl,
        env: defaultEnv,
        token: defaultToken,
        log: {
            debug: defaultDebug,
            format: defaultFormat
        }
    } = defaultConfig;

    const configCmd = program
        .command("config")
        .addHelpCommand(false)
        .alias("c")
        .usage("[command] ")
        .description("Config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings");

    configCmd
        .command("print")
        .alias("p")
        .description("Print out the current profile configuration")
        .action(() => {
            const configuration = profileConfig.getConfig();

            if (profileManager.isPathSource())
                displayMessage(`Current configuration: ${profileConfig.path}\n`);
            else
                displayMessage(`Current profile: ${profileManager.getProfileName()}\n`);
            displayObject(configuration, configuration.log.format);
        });

    configCmd
        .command("session")
        .alias("s")
        .description("Print out the current session configuration")
        .action((format: displayFormat) => {
            const session = sessionConfig.getConfig();

            displayObject(session, format);
        });

    const setCmd = configCmd
        .command("set")
        .addHelpCommand(false)
        .description("Set property value in the current profile config");

    setCmd
        .command("json")
        .argument("<json>")
        .description("Set configuration properties from a json object")
        .action(json => {
            let jsonConfig = {};

            try {
                jsonConfig = JSON.parse(json);
            } catch (_) {
                throw new Error("Parsing error: Invalid JSON format");
            }
            if (!profileConfig.setConfig(jsonConfig)) {
                throw new Error("Invalid configuration in json object");
            }
        });

    setCmd
        .command("apiUrl")
        .argument("<url>")
        .description("Specify the Hub API Url")
        .action(url => {
            if (!profileConfig.setApiUrl(url)) {
                throw new Error("Invalid url");
            }
        });

    setCmd
        .command("log")
        .option("--debug <boolean>", "Specify log to show extended view")
        .option("--format <format>", "Specify format between \"pretty\" or \"json\"")
        .description("Specify log options")
        .action(({ debug, format: newFormat }) => {
            if (debug) {
                const debugVal = stringToBoolean(debug);

                if (typeof debugVal === "undefined") {
                    throw new Error("Invalid debug value");
                }
                if (!profileConfig.setDebug(debugVal as boolean)) {
                    throw new Error("Unable to set debug value");
                }
            }
            if (newFormat && !profileConfig.setFormat(newFormat)) {
                throw new Error("Unable to set format value");
            }
        });

    setCmd
        .command("middlewareApiUrl")
        .argument("<url>")
        .description("Specify middleware API url")
        .action(url => {
            if (!profileConfig.setMiddlewareApiUrl(url)) {
                throw new Error("Invalid url");
            }
        });

    setCmd
        .command("scope")
        .argument("<name>")
        .description("Specify default scope that should be used when session start")
        .action(scope => {
            if (!profileConfig.setScope(scope)) {
                throw new Error(`Invalid name: ${scope}`);
            }
        });

    setCmd
        .command("token")
        .argument("<jwt>")
        .description("Specify platform authorization token")
        .action(token => {
            if (!profileConfig.setToken(token)) {
                throw new Error("Invalid token");
            }
        });

    setCmd
        .command("env")
        .addArgument(new commander.Argument("<production|development>").choices(["production", "development"]))
        .description("Specify the environment")
        .action(env => {
            if (!profileConfig.setEnv(env)) {
                throw new Error("Invalid environment");
            }
        });

    const resetCmd = configCmd
        .command("reset")
        .addHelpCommand(false)
        .description("Reset property value to default in the current profile config");

    const resetValue = (defaultValue: any, setCallback: (val: typeof defaultValue) => boolean) => {
        if (!setCallback(defaultValue)) {
            throw new Error("Reset failed.");
        }
    };

    resetCmd
        .command("apiUrl")
        .description("Reset apiUrl")
        .action(() => resetValue(defaultApiUrl, v => profileConfig.setApiUrl(v)));

    resetCmd
        .command("log")
        .description("Reset logger")
        .action(() => resetValue({ defaultFormat, defaultDebug },
            ({ defaultFormat: f, defaultDebug: d }) => profileConfig.setFormat(f) && profileConfig.setDebug(d)));

    resetCmd
        .command("middlewareApiUrl")
        .description("Reset middlewareApiUrl")
        .action(() => resetValue(defaulMiddlewareApiUrl, v => profileConfig.setMiddlewareApiUrl(v)));

    resetCmd
        .command("token")
        .description("Reset token")
        .action(() => resetValue(defaultToken, v => profileConfig.setToken(v)));

    resetCmd
        .command("env")
        .description("Reset env")
        .action(() => resetValue(defaultEnv, v => profileConfig.setEnv(v)));

    resetCmd
        .command("all")
        .description("Reset all configuration")
        .action(() => resetValue(defaultConfig, v => profileConfig.setConfig(v)));

    const profileCmd = configCmd
        .command("profile")
        .alias("pr")
        .addHelpCommand(false)
        .description("Select and work with user profiles");

    profileCmd
        .command("list")
        .alias("ls")
        .description("Show available configuration profiles")
        .action(() => {
            const currentProfile = profileManager.getProfileName();

            displayMessage("Available profiles:");
            listDirFileNames(profilesDir).sort().forEach((profile) => {
                displayMessage(`${profile === currentProfile ? "-> " : "   "}${profile}`);
            });
        });

    profileCmd
        .command("use")
        .argument("<name>")
        .description("Set configuration profile as default to use")
        .action((name) => {
            if (!profileExists(name)) throw Error(`Unknown profile: ${name}`);
            const currentProfile = siConfig.getConfig().profile;

            if (name === currentProfile)
                return;
            sessionConfig.restoreDefaultConfig();
            siConfig.setProfile(name);
        });

    profileCmd
        .command("create")
        .argument("<name>")
        .description("Create new configuration profile")
        .action((name) => {
            if (profileExists(name)) throw Error(`Profile ${name} already exist`);
            new ProfileConfig(profileNameToPath(name)).writeConfig(profileConfig.getDefaultConfig());
        });

    profileCmd
        .command("remove")
        .argument("<name>")
        .description("Remove existing profile configuration")
        .action((name) => {
            if (!profileExists(name)) throw Error(`Unknown profile: ${name}`);
            if (name === defaultConfigName) {
                throw new Error(`You can't remove ${defaultConfigName} profile`);
            }
            profileRemove(name);
        });
};
