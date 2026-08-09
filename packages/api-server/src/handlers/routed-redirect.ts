import { IncomingHttpHeaders } from "http";

export type RoutedRedirectParseResult =
    | { kind: "none" }
    | { kind: "invalid"; reason: string }
    | { kind: "redirect"; location?: string; routeDomain: string; targetPath: string };

export function parseRoutedRedirect(_response: {
    statusCode?: number;
    headers?: IncomingHttpHeaders | Record<string, string | string[] | number | undefined>;
}): RoutedRedirectParseResult {
    const response = _response;
    const headers = response.headers || {};

    if (response.statusCode !== 308) {
        return { kind: "none" };
    }

    const readHeader = (name: string): string | undefined => {
        const value = headers[name] ?? headers[name.toLowerCase()];

        if (Array.isArray(value)) {
            return value[0];
        }

        return value === undefined ? undefined : String(value);
    };
    const decision = readHeader("x-scramjet-route-decision");
    const routeDomain = readHeader("x-scramjet-route-domain");
    const targetPath = readHeader("x-scramjet-route-target-path");
    const location = readHeader("location");

    if (decision !== "redirect" && decision !== "follow") {
        return { kind: "invalid", reason: "unknown-decision" };
    }

    if (!routeDomain) {
        return { kind: "invalid", reason: "missing-route-domain" };
    }

    if (!targetPath) {
        return { kind: "invalid", reason: "missing-target-path" };
    }

    return { kind: "redirect", location, routeDomain, targetPath };
}
