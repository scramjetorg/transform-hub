import { IncomingMessage, ServerResponse } from "http";
import { ForwardStrategy, NextCallback } from "@scramjet/types";
import http from "http";
import https from "https";
import { CeroError } from "../lib/definitions";

/**
 * Creates a forwarding controller that forwards requests to one of the provided URLs.
 * The target URL is chosen by the optional strategy function. If no strategy is provided, roundRobinStrategy is used.
 * @param urls An array of target base URLs (e.g. "http://example.com" or "https://example.com")
 * @param strategy Optional strategy function to pick a URL based on the request and available URLs.
 * @returns A middleware function that forwards incoming HTTP requests.
 */
export function createForwardController(
	urls: string[],
	strategy: ForwardStrategy
) {
	return async (req: IncomingMessage, res: ServerResponse, next: NextCallback): Promise<void> => {
		if (!urls.length) {
			throw new CeroError("ERR_BAD_GATEWAY");
		}
		// Choose target URL using the provided strategy or default to roundRobinStrategy.
		const targetUrl = await strategy(req, urls);
		const parsedUrl = new URL(targetUrl);
		const protocol = parsedUrl.protocol === "https:" ? https : http;
		const options = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : (parsedUrl.protocol === "https:" ? 443 : 80),
			path: req.url, // Forward the original URL path and query.
			method: req.method,
			headers: req.headers,
		};
		const proxyReq = protocol.request(options, (proxyRes) => {
			// Set response headers and status code.
			res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
			proxyRes.pipe(res, { end: true });
		});
		proxyReq.on("error", (err) => {
			next(err);
		});
		// Pipe the incoming request body to proxy request.
		req.pipe(proxyReq, { end: true });
	};
}