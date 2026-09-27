import test from "ava";
import { Readable } from "stream";
import { registerNativeSth } from "../src/lib/native-verser2-registration";

const config = {
    broker: { targetDomain: "manager.scramjet.internal" },
    timeouts: { routeReadinessMs: 1000 }
};

function broker(statusCode = 200, body = '{"id":"sth-registered"}') {
    const requests: any[] = [];
    return {
        requests,
        getRoutes: () => [{ targetId: "manager", domain: config.broker.targetDomain }],
        waitForRoute: async (domain: string) => {
            if (domain !== config.broker.targetDomain) throw new Error("unexpected route");
        },
        request: async (request: any) => {
            requests.push(request);
            return { statusCode, body: Readable.from([body]) };
        }
    };
}

test("native registration posts the Manager contract over the Verser2 route", async t => {
    const transport = broker();
    const result = await registerNativeSth(transport, config, {
        id: "sth-1",
        description: "native",
        tags: ["dev"],
        enrollmentToken: "token",
        routeDomain: "sth-1.scramjet.internal"
    });

    t.deepEqual(result, { id: "sth-registered" });
    t.is(transport.requests[0].path, "/api/v1/sth");
    t.is(transport.requests[0].method, "POST");
    t.is(transport.requests[0].targetId, "manager");
});

test("native registration reports Manager errors", async t => {
    await t.throwsAsync(
        registerNativeSth(broker(503, "unavailable"), config, { routeDomain: "sth.scramjet.internal" }),
        { message: "Manager STH registration failed: 503" }
    );
});
