import { type CommandDescriptor, cmd } from "@scramjet/config";
import { isProductionEnv } from "../../types";
import { profileManager, sessionConfig } from "../config";
import { displayProdOnlyMsg } from "../helpers/messages";
import { displayLogStream, displayObject } from "../output";
import { getMiddlewareClient } from "../platform";
import { CapabilityUnavailableError, getNativeCapabilities } from "../capabilities";
import { configControlCommands } from "./configControls";
/**
 * Builds the `space` command descriptor tree.
 */
export function createSpaceCommand(nativeProfile = Boolean(profileManager.getProfileConfig().get().verser2)): CommandDescriptor { return cmd("space", (b) => {
    const isProdEnv = isProductionEnv(profileManager.getProfileConfig().env);

    if (!isProdEnv && !nativeProfile) {
        b.hidden(true)
            .action(() => displayProdOnlyMsg("space"))
            .children(configControlCommands("space"));
        return;
    }

    const middlewareClient = () => getMiddlewareClient();

    b.alias("spc")
        .usage("[command] [options...]")
        .option("-c, --stdout", "Output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "Output path - defaults to dirname")
        .desc("Operations on grouped and separated runtime environments that allow sharing the data within them")
        .children(
            cmd("info", (c) => {
                c.desc("Display info about the default space").action(async () => {
                    const spaceId = sessionConfig.lastSpaceId;
                    const native = getNativeCapabilities();
                    if (native) return displayObject({ spaceId, version: await native.managerJson("GET", "/api/v2/version") }, profileManager.getProfileConfig().format);
                    const managerClient = middlewareClient().getManagerClient(spaceId);
                    const version = await managerClient.getVersion();

                    displayObject({ spaceId, version, managerClient }, profileManager.getProfileConfig().format);
                });
            }),
            cmd("list", (c) => {
                c.alias("ls")
                    .desc("List all existing spaces")
                    .action(async () => {
                        const native = getNativeCapabilities();
                        if (native) {
                            const spaces = await native.rootJson<{ items?: unknown[] }>("GET", "/api/v2/spaces");
                            return displayObject(spaces.items || [], profileManager.getProfileConfig().format);
                        }
                        const managers = await middlewareClient().getManagers();

                        return displayObject(managers, profileManager.getProfileConfig().format);
                    });
            }),
            cmd("use", (c) => {
                c.argument("<name>")
                    .desc("Use the space")
                    .action(async (name: string) => {
                        const native = getNativeCapabilities();
                        if (native) {
                            // The argument is authoritative; validate it at its own route before
                            // changing the session selection.
                            const version = await native.spaceJson<object>("GET", "/api/v2/version", undefined, {}, name);
                            displayObject({ name, ...version }, profileManager.getProfileConfig().format);
                            sessionConfig.setLastSpaceId(name);
                            return;
                        }
                        const managerClient = middlewareClient().getManagerClient(name);

                        displayObject({ name, ...(await managerClient.getVersion()) }, profileManager.getProfileConfig().format);
                        sessionConfig.setLastSpaceId(name);
                    });
            }),
            cmd("audit", (c) => {
                c.desc("Fetch all audit messages from spaces").option("--log-format <pretty|json|raw>", "Render each audit record").action(async (options: Record<string, unknown>) => {
                    const native = getNativeCapabilities();
                    return displayLogStream(native ? native.rootStream("/api/v2/audit") : middlewareClient().getAuditStream(), options.logFormat as any);
                });
            }),
            cmd("logs", (c) => {
                c.argument("[<space_name>]", "The name of the space (defaults to current space)")
                    .option("--log-format <pretty|json|raw>", "Render each log record")
                    .desc("Fetch all logs from space")
                    .action(async (spaceName: string, options: Record<string, unknown>) => {
                        if (typeof spaceName === "undefined") spaceName = sessionConfig.lastSpaceId;
                        const native = getNativeCapabilities();
                        if (native) return displayLogStream(native.spaceStream("/api/v2/logs", spaceName), options.logFormat as any);

                        const managerClient = middlewareClient().getManagerClient(spaceName);

                        await displayLogStream(managerClient.getLogStream(), options.logFormat as any);
                    });
            }),
            cmd("version", (c) => {
                c.desc("Display space version").action(async () => {
                    const spaceName = sessionConfig.lastSpaceId;
                    const native = getNativeCapabilities();
                    if (native) return displayObject(await native.managerJson("GET", "/api/v2/version"), profileManager.getProfileConfig().format);
                    const managerClient = middlewareClient().getManagerClient(spaceName);
                    const version = await managerClient.getVersion();

                    displayObject(version, profileManager.getProfileConfig().format);
                });
            }),
            cmd("access", (c) => {
                c.desc("Manages Access Keys for active Space").children(
                    cmd("create", (cc) => {
                        cc.argument("<description>", "Key description")
                            .desc('Create Access key for adding Hubs to active Space, i.e "Army of Darkness"')
                            .action(async (description: string) => {
                                if (getNativeCapabilities()) throw new CapabilityUnavailableError("Space access create");
                                const spaceName = sessionConfig.lastSpaceId;

                                if (!spaceName) {
                                    throw new Error("No Space set");
                                }

                                const accessKey = await middlewareClient().createAccessKey(spaceName, { description });

                                displayObject(accessKey, profileManager.getProfileConfig().format);
                            });
                    }),
                    cmd("list", (cc) => {
                        cc.alias("ls")
                            .desc("List Access Keys metadata in active Space")
                            .action(async () => {
                                if (getNativeCapabilities()) throw new CapabilityUnavailableError("Space access list");
                                const spaceName = sessionConfig.lastSpaceId;

                                if (!spaceName) {
                                    throw new Error("No Space set");
                                }

                                displayObject(await middlewareClient().listAccessKeys(spaceName), profileManager.getProfileConfig().format);
                            });
                    }),
                    cmd("revoke", (cc) => {
                        cc.desc("Revokes Access Key in active Space")
                            .option("--id <id>", "revoke specified key")
                            .option("--all", "Removes all access keys and disconnects all self-hosted Hubs connected to Space")
                            .action(async (options: Record<string, unknown>) => {
                                if (getNativeCapabilities()) throw new CapabilityUnavailableError("Space access revoke");
                                const all = options.all as boolean;
                                const id = options.id as string;
                                const spaceName = sessionConfig.lastSpaceId;

                                if ((all && id) || (!all && !id)) {
                                    throw new Error("Please provide one of the options, please use command with --help to get more information");
                                }

                                if (!spaceName) {
                                    throw new Error("No Space set");
                                }

                                if (id) {
                                    const revokedAccessKey = await middlewareClient().revokeAccessKey(spaceName, id);

                                    return displayObject(revokedAccessKey, profileManager.getProfileConfig().format);
                                }

                                const apiKeys = await middlewareClient().listAccessKeys(spaceName);

                                if (!apiKeys.accessKeys || apiKeys.accessKeys.length === 0) {
                                    throw new Error("There are no keys to revoke");
                                }

                                const revokedAccessKeys = await middlewareClient().revokeAllAccessKeys(spaceName);

                                return displayObject(revokedAccessKeys, profileManager.getProfileConfig().format);
                            });
                    })
                );
            }),
            configControlCommands("space")
        );
}); }

export const spaceCommand = createSpaceCommand();
