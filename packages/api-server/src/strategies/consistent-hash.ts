import { getRequestRemoteAddress } from "@scramjet/utility";
import { IncomingMessage } from "http";

/**
 * Consistent hash strategy function.
 * Chooses a URL based on a hash of the request header "x-consistent-key".
 * @param req The incoming request object.
 * @param urls An array of URLs to choose from.
 * @returns A tuple containing the chosen URL and the request URL.
 */
export function consistentHashStrategy<X>(req: IncomingMessage, urls: X[]): [X, string] {
    let key = req.headers["x-source-id"] || req.headers["x-forwarded-for"] || getRequestRemoteAddress(req);

    if (Array.isArray(key)) key = key[0];
    if (!key) key = "";
    const hash = hashString(key);
    const index = hash % urls.length;

    return [urls[index], req.url] as [X, string];
}

function hashString(str: string): number {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}
