import { cmd, type CommandDescriptor } from "@scramjet/config";
import { isProductionEnv } from "../../types";
import { getHostClient } from "../common";
import { profileManager, sessionConfig } from "../config";
import { getMiddlewareClient } from "../platform";
import { displayEntity, displayLogStream, displayObject } from "../output";
import { getInfo } from "../helpers/various";
import { CapabilityUnavailableError, getNativeCapabilities } from "../capabilities";
import { configControlCommands } from "./configControls";

export function buildProdChildren(): CommandDescriptor[] {
    return [
        cmd("use", (c) => {
            c
                .argument("<name|id>")
                .desc("Specify the default Hub you want to work with, all subsequent requests will be sent to this Hub")
                .action(async (id: string) => {
                    const native = getNativeCapabilities();
                    if (native) {
                        const response = await native.managerJson<{ items?: Array<{ id: string }> }>("GET", "/api/v2/hubs");
                        if (!response.items?.some(host => host.id === id)) throw new Error("Host not found");
                        sessionConfig.setLastHubId(id);
                        return;
                    }
                    const space = sessionConfig.lastSpaceId;
                    const managerClient = getMiddlewareClient().getManagerClient(space);
                    const hosts = await managerClient.getHosts();
                    const host = hosts.find((h: any) => h.id === id);

                    if (!host) {
                        throw new Error("Host not found");
                    }
                    managerClient.getHostClient(id);
                    sessionConfig.setLastHubId(id);
                });
        }),
        cmd("list", (c) => {
            c
                .alias("ls")
                .desc("List all the Hubs in the default space")
                .action(async () => {
                    const native = getNativeCapabilities();
                    if (native) {
                        const response = await native.managerJson<{ items?: unknown[] }>("GET", "/api/v2/hubs");
                        return displayObject(response.items || [], profileManager.getProfileConfig().format);
                    }
                    const space = sessionConfig.lastSpaceId;

                    if (!space) {
                        throw new Error("No space selected");
                    }

                    const managerClient = getMiddlewareClient().getManagerClient(space);
                    const hosts = await managerClient.getHosts();

                    displayObject(hosts, profileManager.getProfileConfig().format);
                });
        }),
        cmd("info", (c) => {
            c
                .desc("Display info about the default Hub")
                .action(async () => {
                    const native = getNativeCapabilities();
                    if (native) {
                        const response = await native.managerJson<{ items?: Array<{ id: string }> }>("GET", "/api/v2/hubs");
                        const host = response.items?.find(item => item.id === sessionConfig.lastHubId);
                        if (!host) throw new Error("Host not found");
                        return displayObject(host, profileManager.getProfileConfig().format);
                    }
                    displayObject((await getInfo()).host, profileManager.getProfileConfig().format);
                });
        }),
        cmd("disconnect", (c) => {
            c
                .desc("Disconnect self hosted Hubs from space")
                .argument("<space_name>", "The name of the Space")
                .argument("[hub_id]", "Hub Id")
                .option("--id <id>", "Hub Id")
                .option("--all", "Disconnects all self-hosted Hubs connected to Space")
                .action(async (spaceName: string, hubId: string | Record<string, unknown>, commandOptions?: Record<string, unknown>) => {
                    const options = commandOptions || (typeof hubId === "object" ? hubId : {});
                    const id = typeof hubId === "string" ? hubId : options.id as string;
                    const all = options.all as boolean;
                    const native = getNativeCapabilities();
                    if (native) {
                        if (all) throw new CapabilityUnavailableError("Hub disconnect all (native v2 only binds single-Hub inventory control)");
                        if (typeof id !== "string") throw new Error("Missing --id or --all");
                        return displayObject(await native.managerJson("DELETE", `/api/v2/inventory/hubs/${encodeURIComponent(id)}`, undefined, {}, { disconnect: true }, spaceName), profileManager.getProfileConfig().format);
                    }
                    const managerClient = getMiddlewareClient().getManagerClient(spaceName);
                    let opts: { id?: string; limit?: number } = {};

                    if (typeof id === "string") {
                        opts = { id };
                    }

                    if (all) {
                        opts = { limit: 0 };
                    }
                    if (!Object.keys(opts).length) {
                        throw new Error("Missing --id or --all");
                    }

                    displayObject(await managerClient.disconnectHubs(opts), profileManager.getProfileConfig().format);
                });
        }),
        cmd("delete", (c) => {
            c
                .alias("rm")
                .desc("Delete self hosted Hub from space")
                .argument("<id>", "Hub Id")
                .option("-f, --force", "Enable deleting Hubs that are not disconnected")
                .action(async (id: string, options: Record<string, unknown>) => {
                    const force = options.force as boolean;
                    const native = getNativeCapabilities();
                    if (native) {
                        return displayObject(await native.managerJson("DELETE", `/api/v2/inventory/hubs/${encodeURIComponent(id)}`, undefined, {}, { delete: true, force }), profileManager.getProfileConfig().format);
                    }
                    const spaceName = sessionConfig.lastSpaceId;
                    const managerClient = getMiddlewareClient().getManagerClient(spaceName);

                    let result;

                    try {
                        result = await managerClient.deleteHub(id, force);
                    } catch (e: any) {
                        if (e.body) {
                            console.error(e.message);
                            throw Error(JSON.parse(e.body).error);
                        }

                        throw e;
                    }

                    displayObject(result, profileManager.getProfileConfig().format);
                });
        })
    ];
}

function buildCommonChildren(): CommandDescriptor[] {
    return [
        cmd("logs", (c) => {
            c
                .desc("Pipe running Hub log to stdout")
                .option("--log-format <pretty|json|raw>", "Render each log record")
                .action(async (options: Record<string, unknown>) => { const native = getNativeCapabilities(); return displayLogStream(native ? native.stream("/api/v2/logs") : getHostClient().getLogStream(), options.logFormat as any); });
        }),
        cmd("audit", (c) => {
            c
                .desc("Pipe running Hub audit information to stdout")
                .option("--log-format <pretty|json|raw>", "Render each audit record")
                .action(async (options: Record<string, unknown>) => { const native = getNativeCapabilities(); return displayLogStream(native ? native.stream("/api/v2/audit") : getHostClient().getAuditStream(), options.logFormat as any); });
        }),
        cmd("load", (c) => {
            c
                .desc("Monitor CPU, memory and disk usage on the Hub")
                .action(async () => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("GET", "/api/v2/load") : getHostClient().getLoadCheck(), profileManager.getProfileConfig().format); });
        }),
        cmd("version", (c) => {
            c
                .desc("Display version of the default Hub")
                .action(async () => { const native = getNativeCapabilities(); return displayEntity(native ? native.json("GET", "/api/v2/version") : getHostClient().getVersion(), profileManager.getProfileConfig().format); });
        }),
        configControlCommands("hub")
    ];
}

/**
 * Builds the `hub` command descriptor tree.
 */
export const hubCommand: CommandDescriptor = cmd("hub", (b) => {
    const profileConfig = profileManager.getProfileConfig();
    const isProdEnv = isProductionEnv(profileConfig.env);

    b
        .usage("[command] [options...]")
        .desc("Allows to run programs in different data centers, computers or devices in local network");

    if (isProdEnv || profileConfig.get().verser2) {
        b.children(...buildProdChildren(), ...buildCommonChildren());
    } else {
        b.children(...buildCommonChildren());
    }
});
