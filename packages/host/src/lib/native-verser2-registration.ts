import { Readable } from "stream";
import { STHOutboundVerser2Config } from "@scramjet/api-types";
import { Verser2RunnerBroker } from "./runner-transport";

export type NativeSthRegistrationOptions = {
    id?: string;
    description?: string;
    tags?: string[];
    enrollmentToken?: string;
    routeDomain: string;
};

/** Register an STH through the already connected native Verser2 route. */
export async function registerNativeSth(
    broker: Pick<Verser2RunnerBroker, "getRoutes" | "waitForRoute" | "request">,
    config: Pick<STHOutboundVerser2Config, "broker" | "timeouts">,
    options: NativeSthRegistrationOptions
): Promise<{ id?: string }> {
    await broker.waitForRoute(config.broker.targetDomain, config.timeouts.routeReadinessMs);

    const route = broker.getRoutes().find(candidate => candidate.domain === config.broker.targetDomain);
    if (!route) {
        throw new Error(`Manager verser2 route unavailable: ${config.broker.targetDomain}`);
    }

    const payload = JSON.stringify({
        id: options.id,
        description: options.description || "",
        tags: options.tags || [],
        enrollmentToken: options.enrollmentToken,
        routeDomain: options.routeDomain
    });
    const response = await broker.request({
        targetId: route.targetId,
        routeDomain: route.domain,
        method: "POST",
        path: "/api/v1/sth",
        headers: { "content-type": "application/json" },
        body: Readable.from([Buffer.from(payload)])
    });

    const chunks: Buffer[] = [];
    for await (const chunk of response.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const statusCode = response.statusCode || 500;
    if (statusCode >= 400) {
        throw new Error(`Manager STH registration failed: ${statusCode}`);
    }

    const responseBody = Buffer.concat(chunks).toString("utf8");
    return responseBody ? JSON.parse(responseBody) as { id?: string } : {};
}
