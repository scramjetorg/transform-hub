import http, { IncomingMessage, ServerResponse } from "http";
import { ForwardStrategy, NextCallback } from "@scramjet/api-types";
import https from "https";
import { CeroError } from "../lib/definitions";

/**
 * Creates a forwarding controller that forwards requests to one of the provided URLs.
 * The target URL is chosen by the optional strategy function. If no strategy is provided, roundRobinStrategy is used.
 * @param basePath The base path to match for forwarding requests
 * @param urls An array of target base URLs (e.g. "http://example.com" or "https://example.com")
 * @param strategy Optional strategy function to pick a URL based on the request and available URLs.
 * @returns A middleware function that forwards incoming HTTP requests.
 */
export function createForwardController(
    basePath: string,
    urls: string[],
    strategy: ForwardStrategy
) {
    return async (req: IncomingMessage, res: ServerResponse & { errorMessage?: string }, next: NextCallback): Promise<void> => {
        // Check if request path starts with basePath.
        if (!req.url || !req.url.startsWith(basePath)) {
            next(new CeroError("ERR_NOT_FOUND"));
            return;
        }
        // Remove basePath from request URL.
        req.url = req.url.slice(basePath.length);

        // Choose target URL using the provided strategy or default to roundRobinStrategy.
        const [targetUrl, rewriteUrl] = await strategy(req, urls);

        if (!targetUrl) {
            throw new CeroError("ERR_BAD_GATEWAY");
        }
        const parsedUrl = new URL(targetUrl);
        const protocol = parsedUrl.protocol === "https:" ? https : http;
        const defaultPort = parsedUrl.protocol === "https:" ? 443 : 80;
        const port = parsedUrl.port
            ? parseInt(parsedUrl.port, 10)
            : defaultPort
        ;

        const options = {
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port,
            path: rewriteUrl, // Forward the hoisted URL path and query.
            method: req.method,
            headers: {
                ...req.headers
            },
            timeout: 1000
        };

        options.headers.host = parsedUrl.host;

        const proxyReq = protocol.request(options, (proxyRes) => {
            // Set response headers and status code.
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        // Disable Nagle on both ends of the proxy hop so request body chunks
        // and streaming response chunks reach the upstream / downstream
        // peer immediately instead of being coalesced by TCP.
        proxyReq.on("socket", (socket) => {
            if (typeof socket.setNoDelay === "function") socket.setNoDelay(true);
        });
        if (typeof res.socket?.setNoDelay === "function") res.socket.setNoDelay(true);

        proxyReq.on("error", (err: Error & { code: any }) => {
            if (typeof err.code === "string") {
                err.code = 500;
            }
            res.errorMessage = err.message;
            next(err);
        });

        req.pipe(proxyReq, { end: true });
    };
}
