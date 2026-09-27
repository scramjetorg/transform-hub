
import { cmd, type CommandDescriptor } from "@scramjet/config";
import { stringToBoolean } from "../../utils/stringToBoolean";
import { profileManager, siConfig, sessionConfig, isProfileConfig } from "../config";
import { displayMessage, displayObject } from "../output";
import { publicVerser2Profile } from "../config/verser2Profile";
import { readFileSync, mkdirSync, existsSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";
import { compileVerser2ConnectionBundle, connectionBundleFingerprint, decodeVerser2ConnectionBundle } from "@scramjet/config";
import { ApiCommandError } from "../apiCommandError";
import { profileNameToPath } from "../paths";
import ProfileConfig from "../config/profileConfig";
import { resolveSelectedTransport } from "../config/transportResolver";

function decodeBundleInput(value: string): any {
    try {
        const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
        return decodeVerser2ConnectionBundle(Buffer.from(padded, "base64").toString("utf8"));
    } catch (error) { throw new ApiCommandError("PROFILE", 61, error instanceof Error ? error.message : "Invalid connection bundle"); }
}

export function importConnectionBundle(encoded: string, profileName?: string, overwrite = false): string {
    const bundle = decodeBundleInput(encoded);
    const name = profileName || bundle.profileName;
    const target = profileNameToPath(name);
    if (existsSync(target) && !overwrite) throw new ApiCommandError("PROFILE", 61, `Profile ${name} already exists; use --overwrite`);
    const trustDir = resolve(homedir(), ".si", "trust");
    mkdirSync(trustDir, { recursive: true });
    const caPath = resolve(trustDir, `${connectionBundleFingerprint(bundle.trust.caPem)}.pem`);
    const stagedCa = `${caPath}.tmp-${process.pid}`;
    const profile = new ProfileConfig(target);
    const compiled = compileVerser2ConnectionBundle(bundle, caPath);
    try {
        writeFileSync(stagedCa, bundle.trust.caPem, { mode: 0o644, flag: "wx" });
        renameSync(stagedCa, caPath);
        profile.restoreDefault();
        if (!profile.set({ transportMode: "native", verser2: compiled })) throw new Error("Unable to persist imported profile");
        siConfig.setProfile(name);
        profileManager.setConfigProfile(name);
        return name;
    } catch (error) {
        if (existsSync(stagedCa)) unlinkSync(stagedCa);
        if (!existsSync(target) && existsSync(caPath)) unlinkSync(caPath);
        throw error instanceof ApiCommandError ? error : new ApiCommandError("PROFILE", 61, error instanceof Error ? error.message : "Import failed");
    }
}

export function effectiveConfiguration() {
    const selected = profileManager.getProfileConfig();
    const configuration: any = selected.get();
    let transport: any;
    try { transport = resolveSelectedTransport(selected); } catch (error) {
        const configured: any = { ...configuration, token: configuration.token ? "********" : "" };
        if (configured.verser2) configured.verser2 = publicVerser2Profile(configured.verser2);
        return { configured, error: error instanceof Error ? error.message : String(error) };
    }
    const configured: any = { ...configuration, token: configuration.token ? "********" : "" };
    if (configured.verser2) configured.verser2 = publicVerser2Profile(configured.verser2);
    return { configured, derived: { mode: transport.mode, endpoint: transport.profile?.endpoint, ingress: transport.profile?.ingress, target: transport.profile?.target }, compatibility: transport.mode === "legacy-http", provenance: transport.provenance };
}

export function diagnoseConfiguration() {
    const selected = profileManager.getProfileConfig();
    let transport: any;
    try { transport = resolveSelectedTransport(selected); }
    catch (error) {
        if (error instanceof ApiCommandError) throw error;
        throw new ApiCommandError("PROFILE", 61, error instanceof Error ? error.message : "Selected profile is invalid");
    }
    const profile = transport.profile;
    const endpoint = profile?.endpoint || selected.get().apiUrl;
    const ingress = profile?.ingress;
    const target = profile?.target || null;
    const stage = (status: string, detail: Record<string, unknown> = {}) => ({ status, category: null, remediation: null, ...detail });
    const endpointStage = { url: endpoint, reachability: stage(transport.mode === "native" ? "configured" : "compatibility") };
    const trustStage = stage(transport.mode === "native" ? "configured" : "compatibility");
    const routeStage = stage(ingress?.routeDomain ? "configured" : "compatibility", ingress?.routeDomain ? { domain: ingress.routeDomain, unique: "not-probed", ready: "not-probed" } : { domain: "http" });
    const identityStage = stage(ingress?.expectedId ? "configured" : "compatibility", { expectedId: ingress?.expectedId || "legacy" });
    const targetStage = stage(target ? "selected" : "none", { value: target });
    const publicPortStage = { port: profile?.endpoint ? Number(new URL(profile.endpoint).port || 443) : undefined, role: profile?.endpoint ? "control" : "legacy-http" };
    return {
        endpoint: endpointStage,
        trust: trustStage,
        route: routeStage,
        identity: identityStage,
        target: targetStage,
        publicPort: publicPortStage,
        stages: { endpointReachability: endpointStage.reachability, trust: trustStage, route: routeStage, ingressIdentity: identityStage, selectedTarget: targetStage, publicPortRole: publicPortStage },
        provenance: transport.provenance
    };
}

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
            cmd("effective", c => c.desc("Show effective transport configuration").action(() => displayObject(effectiveConfiguration(), currentProfileConfig().get().log.format))),
            cmd("native", c => c.children(
                cmd("import", i => i.option("--bundle <base64url>").option("--bundle-file <path>").option("--profile <name>").option("--overwrite").action((options: Record<string, unknown>) => {
                    const value = options.bundle ? String(options.bundle) : options.bundleFile ? readFileSync(String(options.bundleFile), "utf8") : undefined;
                    if (!value || (options.bundle && options.bundleFile)) throw new ApiCommandError("USAGE", 1, "Specify exactly one of --bundle or --bundle-file");
                    displayMessage(`Imported profile ${importConnectionBundle(value, options.profile ? String(options.profile) : undefined, Boolean(options.overwrite))}`);
                })),
                cmd("diagnose", d => d.action(() => displayObject(diagnoseConfiguration(), currentProfileConfig().get().log.format)))
            )),
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
                                .option("--mode <native|legacy-http>")
                                .action((name: string, options: Record<string, unknown>) => { profileManager.createProfile(name, (options.mode as "native" | "legacy-http") || "native"); });
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
