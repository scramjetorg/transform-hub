import { IncomingMessage } from "http";

// Module-level counter for round-robin strategy.
let rrIndex = 0;

/**
 * Round-robin strategy function.
 * Chooses a URL in a round-robin fashion using a module-level counter.
 */
export function roundRobinStrategy<X>(req: IncomingMessage, urls: X[]): [X, string] {
    return [urls[rrIndex++ % urls.length], req.url] as [X, string];
}
