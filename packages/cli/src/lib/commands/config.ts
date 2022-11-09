/* eslint-disable no-console */

import { CommandDefinition } from "../../types";
import { stringToBoolean } from "../../utils/stringToBoolean";
import { profileConfig, profileManager, siConfig, sessionConfig, isProfileConfig, ProfileConfig } from "../config";
import { displayMessage, displayObject } from "../output";
import commander from "commander";

/**
 * Initializes `config` command.
 *
 * @param {Command} program Commander object.
 */
export const config: CommandDefinition = (program) => {
    const defaultConfig = profileConfig.getDefault();

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
            const configuration = profileManager.getProfileConfig().get();

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
        .action(() => {
            const configuration = profileConfig.get();
            const session = sessionConfig.get();

            displayObject(session, configuration.log.format);
        });

    if (isProfileConfig(profileConfig)) {
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
                if (!(profileConfig as ProfileConfig).set(jsonConfig)) {
                    throw new Error("Invalid configuration in json object");
                }
            });

        setCmd
            .command("apiUrl")
            .argument("<url>")
            .description("Specify the Hub API Url")
            .action(url => {
                if (!(profileConfig as ProfileConfig).setApiUrl(url)) {
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
                    if (!(profileConfig as ProfileConfig).setDebug(debugVal as boolean)) {
                        throw new Error("Unable to set debug value");
                    }
                }
                if (newFormat && !(profileConfig as ProfileConfig).setFormat(newFormat)) {
                    throw new Error("Unable to set format value");
                }
            });

        setCmd
            .command("middlewareApiUrl")
            .argument("<url>")
            .description("Specify middleware API url")
            .action(url => {
                if (!(profileConfig as ProfileConfig).setMiddlewareApiUrl(url)) {
                    throw new Error("Invalid url");
                }
            });

        setCmd
            .command("scope")
            .argument("<name>")
            .description("Specify default scope that should be used when session start")
            .action(scope => {
                if (!(profileConfig as ProfileConfig).setScope(scope)) {
                    throw new Error(`Invalid name: ${scope}`);
                }
            });

        setCmd
            .command("token")
            .argument("<jwt>")
            .description("Specify platform authorization token")
            .action(token => {
                if (!(profileConfig as ProfileConfig).setToken(token)) {
                    throw new Error("Invalid token");
                }
            });

        setCmd
            .command("env")
            .addArgument(new commander.Argument("<production|development>").choices(["production", "development"]))
            .description("Specify the environment")
            .action(env => {
                if (!(profileConfig as ProfileConfig).setEnv(env)) {
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
            .action(() => resetValue(defaultApiUrl, v => (profileConfig as ProfileConfig).setApiUrl(v)));

        resetCmd
            .command("log")
            .description("Reset logger")
            .action(() => resetValue({ defaultFormat, defaultDebug },
                ({ defaultFormat: f, defaultDebug: d }) =>
                    (profileConfig as ProfileConfig).setFormat(f) && (profileConfig as ProfileConfig).setDebug(d)));

        resetCmd
            .command("middlewareApiUrl")
            .description("Reset middlewareApiUrl")
            .action(() => resetValue(defaulMiddlewareApiUrl, v =>
                (profileConfig as ProfileConfig).setMiddlewareApiUrl(v)));

        resetCmd
            .command("token")
            .description("Reset token")
            .action(() => resetValue(defaultToken, v => (profileConfig as ProfileConfig).setToken(v)));

        resetCmd
            .command("env")
            .description("Reset env")
            .action(() => resetValue(defaultEnv, v => (profileConfig as ProfileConfig).setEnv(v)));

        resetCmd
            .command("all")
            .description("Reset all configuration")
            .action(() => {
                (profileConfig as ProfileConfig).restoreDefault();
                sessionConfig.restoreDefault();
            });
    }
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
            profileManager.listProfiles().sort().forEach((profile) => {
                displayMessage(`${profile === currentProfile ? "-> " : "   "}${profile}`);
            });
        });

    profileCmd
        .command("use")
        .argument("<name>")
        .description("Set configuration profile as default to use")
        .action((name) => {
            if (!profileManager.profileExists(name)) throw Error(`Unknown profile: ${name}`);
            if (!profileManager.profileIsValid(name)) throw Error(`Profile ${name} contain errors`);
            const currentProfile = siConfig.profile;

            if (name === currentProfile)
                return;

            sessionConfig.restoreDefault();
            siConfig.setProfile(name);
        });

    profileCmd
        .command("create")
        .argument("<name>")
        .description("Create new configuration profile")
        .action((name) => { profileManager.createProfile(name); });

    profileCmd
        .command("remove")
        .argument("<name>")
        .description("Remove existing profile configuration")
        .action((name) => { profileManager.removeProfile(name); });
};
