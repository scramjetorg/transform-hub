export type ManagerRouteDecisionKind = "follow" | "manager-multiplex" | "manager-owned" | "unsupported-bidirectional";

export type ManagerRouteTarget = {
    sthId?: string;
    instanceId?: string;
    topicName?: string;
    routeDomain?: string;
    targetPath?: string;
};

export type ManagerRouteDecision = {
    kind: ManagerRouteDecisionKind;
    family: string;
    reason: string;
    target?: ManagerRouteTarget;
};

export type ClassifyManagerRouteOptions = {
    apiBase?: string;
};

const DEFAULT_API_BASE = "/api/v1";

export function classifyManagerRoute(
    method: string | undefined,
    url: string | undefined,
    options: ClassifyManagerRouteOptions = {}
): ManagerRouteDecision {
    const apiBase = normalizeBase(options.apiBase || DEFAULT_API_BASE);
    const requestMethod = (method || "GET").toUpperCase();
    const path = normalizePath(url);
    const relativePath = stripApiBase(path, apiBase);
    const segments = relativePath.split("/").filter(Boolean).map(decodeURIComponent);

    if (!segments.length) {
        return managerOwned("manager-root", "Manager owns the API root response");
    }

    if (segments[0] === "sth") {
        return classifySthRoute(requestMethod, segments);
    }

    if (segments[0] === "topic") {
        return managerMultiplex("manager-topic", "Manager topic routes are live fan-in/fan-out multiplexers", {
            topicName: segments[1]
        });
    }

    if (segments[0] === "instance") {
        return classifyInstanceRoute(requestMethod, segments, `/${segments.join("/")}`);
    }

    if (segments[0] === "s3") {
        return managerOwned("manager-storage", "Manager owns sequence package storage state");
    }

    if (segments[0] === "rpc") {
        return follow("host-rpc", "RPC requests target one selected exposed instance", {
            targetPath: `/${segments.join("/")}`
        });
    }

    return classifyManagerOwnedRoute(requestMethod, segments);
}

function classifySthRoute(method: string, segments: string[]): ManagerRouteDecision {
    const sthId = segments[1];

    if (!sthId) {
        return managerOwned("sth-registry", "Manager owns the connected-STH registry");
    }

    if (segments[2] === "info") {
        return managerOwned("sth-info", "Manager owns connected-STH registry metadata", { sthId });
    }

    if (segments.length === 2 && method === "DELETE") {
        return managerOwned("sth-disconnect", "Manager owns STH disconnect policy", { sthId });
    }

    const hostSegments = segments.slice(2);
    const targetPath = `/${hostSegments.join("/")}`;
    const target = {
        sthId,
        routeDomain: `sth.${sthId}.scramjet.internal`,
        targetPath: targetPath === "/" ? "/" : targetPath
    };

    return classifyHostRoute(method, hostSegments, target);
}

function classifyHostRoute(method: string, segments: string[], target: ManagerRouteTarget): ManagerRouteDecision {
    const family = segments[0] || "host-root";

    if (family === "platform") {
        return unsupportedBidirectional("host-platform", "Host /platform is a duplex Manager/STH control stream", target);
    }

    if (family === "topic") {
        return managerMultiplex("host-topic", "Manager API topic routes require live multiplexing unless a single direct peer is resolved", target);
    }

    if (family === "log" || family === "audit") {
        return managerMultiplex(`host-${family}`, `Manager aggregate ${family} routes require fan-in multiplexing`, target);
    }

    if (family === "instance") {
        return classifyInstanceRoute(method, segments, target.targetPath || `/${segments.join("/")}`, target);
    }

    if (family === "rpc") {
        return follow("host-rpc", "Host RPC routes target one selected exposed instance", target);
    }

    if (family === "sequence") {
        if (method === "POST" || method === "PUT" || method === "DELETE") {
            return follow("host-sequence-write", "Sequence writes are single-owner STH actions", target);
        }

        return follow("host-sequence-read", "Sequence reads target one selected STH", target);
    }

    if (["sequences", "instances", "entities", "load-check", "version", "config", "status", "topics"].includes(family)) {
        return follow("host-state-read", "Host state reads target one selected STH", target);
    }

    return follow("host-generic", "Generic /sth/:id route targets one selected STH and remains redirect-ready", target);
}

function classifyInstanceRoute(
    method: string,
    segments: string[],
    targetPath: string,
    baseTarget: ManagerRouteTarget = {}
): ManagerRouteDecision {
    const instanceId = segments[1] === "instance" ? segments[2] : segments[1];
    const opIndex = segments[0] === "instance" ? 2 : 1;
    const op = segments[opIndex] || "";
    const target = { ...baseTarget, instanceId, targetPath };

    if (op === "inout") {
        return unsupportedBidirectional("instance-inout", "Instance /inout is a coupled duplex stream requiring a dedicated protocol", target);
    }

    if (["stdout", "stderr", "log", "monitoring", "output", "stdin", "input", "events"].includes(op)) {
        return managerMultiplex("instance-stream", "Instance streams may require fan-in/fan-out unless a direct single target is selected", target);
    }

    if (op === "rpc") {
        return follow("instance-rpc", "Instance RPC routes target one selected exposed instance", target);
    }

    if (["_stop", "_kill", "_event", "_monitoring_rate", "set"].includes(op) && method === "POST") {
        return follow("instance-control", "Instance control actions mutate one selected instance", target);
    }

    if (["", "health", "event", "once"].includes(op)) {
        return follow("instance-read", "Instance read/event routes target one selected instance", target);
    }

    return follow("instance-generic", "Unknown instance routes are single-target only after an owner is resolved", target);
}

function classifyManagerOwnedRoute(method: string, segments: string[]): ManagerRouteDecision {
    const family = segments[0];

    if (["version", "config", "health", "list", "instances", "sequences", "all_sequences", "entities", "topics", "load"].includes(family)) {
        return managerOwned("manager-state", "Manager owns aggregate state and metadata responses");
    }

    if (family === "load-stream") {
        return managerMultiplex("manager-load-stream", "Manager owns the live load stream");
    }

    if (family === "log" || family === "audit") {
        return managerMultiplex(`manager-${family}`, `Manager ${family} route aggregates multiple sources`);
    }

    if (family === "store" && method === "DELETE") {
        return managerOwned("manager-store", "Manager owns store index cleanup");
    }

    if (family === "disconnect" && method === "POST") {
        return managerOwned("manager-disconnect", "Manager owns disconnect policy");
    }

    return managerOwned("manager-unknown", "Unrecognized Manager routes remain Manager-owned until explicitly classified");
}

function follow(family: string, reason: string, target?: ManagerRouteTarget): ManagerRouteDecision {
    return { kind: "follow", family, reason, target };
}

function managerMultiplex(family: string, reason: string, target?: ManagerRouteTarget): ManagerRouteDecision {
    return { kind: "manager-multiplex", family, reason, target };
}

function managerOwned(family: string, reason: string, target?: ManagerRouteTarget): ManagerRouteDecision {
    return { kind: "manager-owned", family, reason, target };
}

function unsupportedBidirectional(family: string, reason: string, target?: ManagerRouteTarget): ManagerRouteDecision {
    return { kind: "unsupported-bidirectional", family, reason, target };
}

function normalizePath(url: string | undefined): string {
    const path = (url || "/").split("?", 1)[0] || "/";

    return path.startsWith("/") ? path : `/${path}`;
}

function normalizeBase(apiBase: string): string {
    const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;

    return base.startsWith("/") ? base : `/${base}`;
}

function stripApiBase(path: string, apiBase: string): string {
    if (path === apiBase) {
        return "/";
    }

    return path.startsWith(`${apiBase}/`) ? path.slice(apiBase.length) : path;
}
