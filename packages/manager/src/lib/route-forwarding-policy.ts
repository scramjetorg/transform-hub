export type RouteForwardingOrigin = "external-api" | "local-api" | "manager-downward" | "runtime-sequence";

export interface RouteForwardingPolicyInput {
    routeDomain: string;
    targetPath: string;
    origin: RouteForwardingOrigin;
}

export type RouteForwardingPolicyDecision =
    | { action: "return-redirect"; direction: "upward" | "downward" | "local" | "unknown" }
    | { action: "tunnel"; direction: "upward" | "downward" | "local" };

export function decideRouteForwardingPolicy(_input: RouteForwardingPolicyInput): RouteForwardingPolicyDecision {
    return { action: "return-redirect", direction: "unknown" };
}
