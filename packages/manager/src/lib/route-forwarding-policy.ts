export type RouteForwardingOrigin = "external-api" | "local-api" | "manager-downward" | "runtime-sequence";

export interface RouteForwardingPolicyInput {
    routeDomain: string;
    targetPath: string;
    origin: RouteForwardingOrigin;
}

export type RouteForwardingPolicyDecision =
    | { action: "return-redirect"; direction: "upward" | "downward" | "local" | "unknown" }
    | { action: "tunnel"; direction: "upward" | "downward" | "local" };

export function isTrustedSthRouteDomain(id: string, routeDomain: string): boolean {
    const exactDomain = `sth.${id}.scramjet.internal`;
    const scopedPrefix = `sth.${id}-`;

    return routeDomain === exactDomain || (routeDomain.startsWith(scopedPrefix) && routeDomain.endsWith(".scramjet.internal"));
}

export function decideRouteForwardingPolicy(_input: RouteForwardingPolicyInput): RouteForwardingPolicyDecision {
    const input = _input;

    if (input.routeDomain.startsWith("runner.")) {
        return { action: "tunnel", direction: "local" };
    }

    if (input.routeDomain.startsWith("sth.")) {
        return input.origin === "external-api"
            ? { action: "return-redirect", direction: "downward" }
            : { action: "tunnel", direction: "downward" };
    }

    if (input.routeDomain.startsWith("manager.")) {
        return input.origin === "runtime-sequence"
            ? { action: "tunnel", direction: "upward" }
            : { action: "return-redirect", direction: "upward" };
    }

    return { action: "return-redirect", direction: "unknown" };
}
