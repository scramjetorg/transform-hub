import { IncomingHttpHeaders } from "http";

export type RoutedRedirectParseResult =
    | { kind: "none" }
    | { kind: "invalid"; reason: string }
    | { kind: "redirect"; location?: string; routeDomain: string; targetPath: string };

export function parseRoutedRedirect(_response: {
    statusCode?: number;
    headers?: IncomingHttpHeaders | Record<string, string | string[] | number | undefined>;
}): RoutedRedirectParseResult {
    return { kind: "none" };
}
