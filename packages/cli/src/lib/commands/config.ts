
import { cmd, type CommandDescriptor } from "@scramjet/config";
import { stringToBoolean } from "../../utils/stringToBoolean";
import { profileManager, siConfig, sessionConfig, isProfileConfig } from "../config";
import { displayMessage, displayObject } from "../output";
import { publicVerser2Profile } from "../config/verser2Profile";

/**
 * Builds the `config` command descriptor tree.
 */
export const configCommand: CommandDescriptor = cmd("config", (b) => {
    const profileConfig = profileManager.getProfileConfig();
    const currentProfileConfig = () => profileManager.getProfileConfig();
    const mutableProfileConfig = () => {
        const current = currentProfileConfig();

        if (!isProfileConfig(current)) {
            throw new Error("The selected configuration path is read-only");
        }

        return current;
    };
    const defaultConfig = profileConfig.getDefault();

    const {
        apiUrl: defaultApiUrl,
        middlewareApiUrl: defaulMiddlewareApiUrl,
        env: defaultEnv,
        token: defaultToken,
        log: {
            debug: defaultDebug,
            format: defaultFormat
        }
    } = defaultConfig;

    b
        .alias("c")
        .usage("[command] ")
        .desc("Config contains default Scramjet Transform Hub (STH) and Scramjet Cloud Platform (SCP) settings")
        .children(
            cmd("print", (c) => {
                c
                    .alias("p")
                    .desc("Print out the current profile configuration")
                    .action(() => {
                        const configuration = currentProfileConfig().get();

                        if (profileManager.isPathSource())
                            displayMessage(`Current configuration: ${currentProfileConfig().path}\n`);
                        else
                            displayMessage(`Current profile: ${profileManager.getProfileName()}\n`);
                        displayObject(configuration.verser2 ? { ...configuration, verser2: publicVerser2Profile(configuration.verser2) } : configuration, configuration.log.format);
                    });
            }),
            cmd("session", (c) => {
                c
                    .alias("s")
                    .desc("Print out the current session configuration")
                    .action(() => {
                        const configuration = currentProfileConfig().get();

                        displayObject(sessionConfig.get(), configuration.log.format);
                    });
            }),
            ...(isProfileConfig(profileConfig)
                ? [
                    cmd("set", (setCmd) => {
                        setCmd
                            .desc("Set property value in the current profile config")
                            .children(
                                cmd("json", (c) => {
                                    c
                                        .argument("<json>")
                                        .desc("Set configuration properties from a json object")
                                        .action((json: string) => {
                                            let jsonConfig = {};

                                            try {
                                                jsonConfig = JSON.parse(json);
                                            } catch (_) {
                                                throw new Error("Parsing error: Invalid JSON format");
                                            }
                                            if (!mutableProfileConfig().set(jsonConfig)) {
                                                throw new Error("Invalid configuration in json object");
                                            }
                                        });
                                }),
                                cmd("apiUrl", (c) => {
                                    c
                                        .argument("<url>")
                                        .desc("Specify the Hub API Url")
                                        .action((url: string) => {
                                            if (!mutableProfileConfig().setApiUrl(url)) {
                                                throw new Error("Invalid url");
                                            }
                                        });
                                }),
                                cmd("log", (c) => {
                                    c
                                        .option("--debug <boolean>", "Specify log to show extended view")
                                        .option("--format <format>", "Specify format between \"pretty\" or \"json\"")
                                        .desc("Specify log options")
                                        .action((options: Record<string, unknown>) => {
                                            const debug = options.debug as string | undefined;
                                            const newFormat = options.format as string | undefined;

                                            if (debug) {
                                                const debugVal = stringToBoolean(debug);

                                                if (typeof debugVal === "undefined") {
                                                    throw new Error("Invalid debug value");
                                                }
                                                if (!mutableProfileConfig().setDebug(debugVal as boolean)) {
                                                    throw new Error("Unable to set debug value");
                                                }
                                            }
                                            if (newFormat && !mutableProfileConfig().setFormat(newFormat)) {
                                                throw new Error("Unable to set format value");
                                            }
                                        });
                                }),
                                cmd("middlewareApiUrl", (c) => {
                                    c
                                        .argument("<url>")
                                        .desc("Specify middleware API url")
                                        .action((url: string) => {
                                            if (!mutableProfileConfig().setMiddlewareApiUrl(url)) {
                                                throw new Error("Invalid url");
                                            }
                                        });
                                }),
                                cmd("scope", (c) => {
                                    c
                                        .argument("<name>")
                                        .desc("Specify default scope that should be used when session start")
                                        .action((scope: string) => {
                                            if (!mutableProfileConfig().setScope(scope)) {
                                                throw new Error(`Invalid name: ${scope}`);
                                            }
                                        });
                                }),
                                cmd("token", (c) => {
                                    c
                                        .argument("<jwt>")
                                        .desc("Specify platform authorization token")
                                        .action((token: string) => {
                                            if (!mutableProfileConfig().setToken(token)) {
                                                throw new Error("Invalid token");
                                            }
                                        });
                                }),
                                cmd("env", (c) => {
                                    c
                                        .argument("<production|development>", "Specify environment", true)
                                        .desc("Specify the environment")
                                        .action((env: string) => {
                                            if (!["production", "development"].includes(env)) {
                                                throw new Error("Invalid environment: must be 'production' or 'development'");
                                            }
                                            if (!mutableProfileConfig().setEnv(env as any)) {
                                                throw new Error("Invalid environment");
                                            }
                                        });
                                }),
                                ...["endpoint", "brokerId", "ingress.level", "ingress.expectedId", "ingress.routeDomain", "target.spaceId", "target.hubId", "tls.caFile", "tls.certFile", "tls.keyFile", "tls.pfxFile", "tls.passphraseReference", "timeoutMs"].map(path => cmd(`verser2.${path}`, leaf => leaf.argument("<value>").action((value: string) => {
                                    const changed = mutableProfileConfig().updateVerser2Draft(current => {
                                        const copy: any = current;
                                        const parts = path.split(".");
                                        let target = copy;
                                        for (const part of parts.slice(0, -1)) target = target[part] ||= {};
                                        target[parts[parts.length - 1]] = path === "timeoutMs" ? Number(value) : value;
                                        if (path === "tls.pfxFile") { delete copy.tls.certFile; delete copy.tls.keyFile; }
                                        if (path === "tls.certFile" || path === "tls.keyFile") delete copy.tls.pfxFile;
                                        if (copy.target && !Object.keys(copy.target).length) delete copy.target;
                                        return copy;
                                    });
                                    if (!changed) throw new Error("Invalid Verser2 configuration");
                                    if (mutableProfileConfig().promoteVerser2DraftResult() === "failed") throw new Error("Unable to persist Verser2 configuration");
                                })))
                            );
                    }),
                    cmd("reset", (resetCmd) => {
                        const resetValue = (defaultValue: any, setCallback: (val: typeof defaultValue) => boolean) => {
                            if (!setCallback(defaultValue)) {
                                throw new Error("Reset failed.");
                            }
                        };

                        resetCmd
                            .desc("Reset property value to default in the current profile config")
                            .children(
                                cmd("apiUrl", (c) => {
                                    c
                                        .desc("Reset apiUrl")
                                        .action(() => resetValue(defaultApiUrl, v => mutableProfileConfig().setApiUrl(v)));
                                }),
                                cmd("log", (c) => {
                                    c
                                        .desc("Reset logger")
                                        .action(() => resetValue({ defaultFormat, defaultDebug },
                                            ({ defaultFormat: f, defaultDebug: d }) =>
                                                mutableProfileConfig().setFormat(f) && mutableProfileConfig().setDebug(d)));
                                }),
                                cmd("middlewareApiUrl", (c) => {
                                    c
                                        .desc("Reset middlewareApiUrl")
                                        .action(() => resetValue(defaulMiddlewareApiUrl, v =>
                                            mutableProfileConfig().setMiddlewareApiUrl(v)));
                                }),
                                cmd("token", (c) => {
                                    c
                                        .desc("Reset token")
                                        .action(() => resetValue(defaultToken, v => mutableProfileConfig().setToken(v)));
                                }),
                                cmd("env", (c) => {
                                    c
                                        .desc("Reset env")
                                        .action(() => resetValue(defaultEnv, v => mutableProfileConfig().setEnv(v)));
                                }),
                                cmd("verser2", (c) => {
                                    c.desc("Remove outbound Verser2 profile settings").action(() => {
                                        if (!mutableProfileConfig().resetVerser2()) throw new Error("Reset failed.");
                                    });
                                }),
                                ...["endpoint", "brokerId", "ingress.level", "ingress.expectedId", "ingress.routeDomain", "target.spaceId", "target.hubId", "tls.caFile", "tls.certFile", "tls.keyFile", "tls.pfxFile", "tls.passphraseReference", "timeoutMs"].map(path => cmd(`verser2.${path}`, c => c.action(() => {
                                    if (!mutableProfileConfig().resetVerser2Field(path)) throw new Error("Reset failed.");
                                    if (mutableProfileConfig().promoteVerser2DraftResult() === "failed") throw new Error("Unable to persist Verser2 configuration");
                                }))),
                                cmd("all", (c) => {
                                    c
                                        .desc("Reset all configuration")
                                        .action(() => {
                                            mutableProfileConfig().restoreDefault();
                                            sessionConfig.restoreDefault();
                                        });
                                })
                            );
                    })
                ]
                : []
            ),
            cmd("profile", (profileCmd) => {
                profileCmd
                    .alias("pr")
                    .desc("Select and work with user profiles")
                    .children(
                        cmd("list", (c) => {
                            c
                                .alias("ls")
                                .desc("Show available configuration profiles")
                                .action(() => {
                                    const currentProfile = profileManager.getProfileName();

                                    displayMessage("Available profiles:");
                                    profileManager.listProfiles().sort().forEach((profile: string) => {
                                        displayMessage(`${profile === currentProfile ? "-> " : "   "}${profile}`);
                                    });
                                });
                        }),
                        cmd("use", (c) => {
                            c
                                .argument("<name>")
                                .desc("Set configuration profile as default to use")
                                .action((name: string) => {
                                    if (!profileManager.profileExists(name)) throw Error(`Unknown profile: ${name}`);
                                    if (!profileManager.profileIsValid(name)) throw Error(`Profile ${name} contain errors`);
                                    const currentProfile = siConfig.profile;

                                    if (name === currentProfile) return;

                                    sessionConfig.restoreDefault();
                                    siConfig.setProfile(name);
                                });
                        }),
                        cmd("create", (c) => {
                            c
                                .argument("<name>")
                                .desc("Create new configuration profile")
                                .action((name: string) => { profileManager.createProfile(name); });
                        }),
                        cmd("remove", (c) => {
                            c
                                .argument("<name>")
                                .desc("Remove existing profile configuration")
                                .action((name: string) => {
                                    if (profileManager.getProfileName() === name) {
                                        siConfig.setProfile("default");
                                    }

                                    profileManager.removeProfile(name);
                                });
                        })
                    );
            })
        );
});
