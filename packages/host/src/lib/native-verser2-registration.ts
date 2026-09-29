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
    try {
        await broker.waitForRoute(config.broker.targetDomain, config.timeouts.routeReadinessMs);
    } catch {
        throw new Error("Native STH registration route wait failed");
    }

    const route = broker.getRoutes().find(candidate => candidate.domain === config.broker.targetDomain);
    if (!route) {
        throw new Error("Native STH registration route wait failed");
    }
    console.info("[native-registration] Manager route ready");

    const payload = JSON.stringify({
        id: options.id,
        description: options.description || "",
        tags: options.tags || [],
        enrollmentToken: options.enrollmentToken,
        routeDomain: options.routeDomain
    });
    console.info("[native-registration] Private v2 POST sent");
    const response = await broker.request({
        targetId: route.targetId,
        routeDomain: route.domain,
        method: "POST",
        path: "/api/v2/_internal/sth/registration",
        headers: { "content-type": "application/json" },
        body: Readable.from([Buffer.from(payload)])
    });

    const chunks: Buffer[] = [];
    for await (const chunk of response.body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const statusCode = response.statusCode || 500;
    if (statusCode >= 400) {
        console.warn("[native-registration] Private v2 response rejected", { status: statusCode });
        throw new Error(`Manager STH registration failed: ${statusCode}`);
    }

    console.info("[native-registration] Private v2 response accepted");
    const responseBody = Buffer.concat(chunks).toString("utf8");
    return responseBody ? JSON.parse(responseBody) as { id?: string } : {};
}
