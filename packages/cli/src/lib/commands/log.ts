import { cmd, type CommandDescriptor } from "@scramjet/config";
import { ClientUtilsCustomAgent, type HttpClient } from "@scramjet/client-utils";
import { LogLevelStrings } from "@scramjet/utility";
import { getHostClient } from "../common";
import { CapabilityUnavailableError, getNativeCapabilities } from "../capabilities";
import { profileManager, sessionConfig } from "../config";
import { displayObject } from "../output";

export type LogLevelScope = "root" | "space" | "hub" | "instance";

type V2Client = Pick<HttpClient, "request"> & { apiBase: string; dispose?: () => void };
type LogLevelHttpDependencies = { createV2Client(host: { apiBase: string; client: { agent: any } }): V2Client };
export function v2ApiBase(apiBase: string): string {
    return apiBase.replace(/\/api\/v1\/?$/, "/api/v2");
}

const productionHttpDependencies: LogLevelHttpDependencies = {
    createV2Client: host => new ClientUtilsCustomAgent(v2ApiBase(host.apiBase), host.client.agent)
};
let httpDependencies = productionHttpDependencies;

export function setLogLevelHttpDependencies(overrides?: Partial<LogLevelHttpDependencies>) {
    httpDependencies = overrides ? { ...productionHttpDependencies, ...overrides } : productionHttpDependencies;
}

export async function patchV2WithClient(client: V2Client, path: string, body: { logLevel: string }) {
    const response = await client.request("patch", path, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" }
    });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return await response.json();
}

async function patchV2(path: string, body: { logLevel: string }) {
    const client = httpDependencies.createV2Client(getHostClient());
    try {
        return await patchV2WithClient(client, path, body);
    } finally {
        client.dispose?.();
    }
}

export function validateLogLevel(value: string): string {
    if (!LogLevelStrings.includes(value as any)) throw new Error(`Invalid log level: ${value}. Expected one of: ${LogLevelStrings.join(", ")}`);
    return value;
}

function selectedId(explicit: unknown, remembered: string, label: string): string {
    const value = typeof explicit === "string" && explicit ? explicit : remembered;
    if (!value) throw new Error(`No ${label} selected; provide --${label}-id`);
    return value;
}

async function setLogLevel(level: string, options: Record<string, unknown>) {
    validateLogLevel(level);
    const scope = (options.scope as LogLevelScope | undefined) || "hub";
    if (!["root", "space", "hub", "instance"].includes(scope)) throw new Error(`Invalid log level scope: ${scope}`);

    const spaceId = options.spaceId as string | undefined;
    const hubId = options.hubId as string | undefined;
    const instanceId = options.instanceId as string | undefined;
    const native = getNativeCapabilities();
    let response: unknown;

    if (native) {
        if (scope === "root") response = await native.targetJson("PATCH", "/api/v2/log-level", { logLevel: level }, "root");
        else if (scope === "space") response = await native.targetJson("PATCH", "/api/v2/log-level", { logLevel: level }, "space", spaceId);
        else if (scope === "hub") response = await native.targetJson("PATCH", "/api/v2/log-level", { logLevel: level }, "hub", spaceId, hubId);
        else response = await native.targetJson("PATCH", `/api/v2/instances/${encodeURIComponent(selectedId(instanceId, sessionConfig.lastInstanceId, "instance"))}`, { logLevel: level }, "hub", spaceId, hubId);
    } else if (scope === "instance") {
        response = await patchV2(`/instances/${encodeURIComponent(selectedId(instanceId, sessionConfig.lastInstanceId, "instance"))}`, { logLevel: level });
    } else if (scope === "hub") {
        response = await patchV2("/log-level", { logLevel: level });
    } else {
        throw new CapabilityUnavailableError(`Log level ${scope} control`);
    }

    displayObject(response, profileManager.getProfileConfig().format);
}

export const logCommand: CommandDescriptor = cmd("log", b => b
    .usage("level set <level> [options]")
    .desc("Control log levels")
    .children(
        cmd("level", level => level.children(
            cmd("set", set => set
                .argument("<level>", "Canonical uppercase log level")
                .option("--scope <root|space|hub|instance>", "Target scope (defaults to hub)")
                .option("--space-id <id>", "Space target; defaults to the selected Space")
                .option("--hub-id <id>", "Hub target; defaults to the selected Hub")
                .option("--instance-id <id>", "Instance target; defaults to the selected Instance")
                .desc("Set the live log level")
                .action(setLogLevel)
            )
        ))
    )
);
