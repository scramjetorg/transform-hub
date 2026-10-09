import type { HubWatchHealth, RequiredStartupHealthEntry } from "@scramjet/runtime-types";

export type HubWatchHealthInput = Omit<HubWatchHealth, "healthy" | "status">;

export function projectHubWatchHealth(input: HubWatchHealthInput): HubWatchHealth {
    const required: RequiredStartupHealthEntry[] = input.required.map((entry) => ({ ...entry }));
    const requirementsSatisfied = required.every((entry) => entry.satisfied);
    const ready = input.lifecycle === "running" && input.startupReady && requirementsSatisfied;
    const connected = !input.cpm.configured || input.cpm.connected;

    return {
        ...input,
        required,
        healthy: ready && connected,
        status: !ready ? "unhealthy" : connected ? "healthy" : "degraded"
    };
}
