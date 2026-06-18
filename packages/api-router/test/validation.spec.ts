import test from "ava";
import { z } from "zod";

import { RouteValidationError, validateRouteRequest, validateRouteResponse } from "../src";

test("validates route request locations with Zod schemas", t => {
    const request = validateRouteRequest({
        params: z.object({ id: z.string() }),
        query: z.object({ limit: z.number().int() }),
        headers: z.object({ authorization: z.string() }),
        body: z.object({ enabled: z.boolean() })
    }, {
        params: { id: "seq-1" },
        query: { limit: 10 },
        headers: { authorization: "Bearer token" },
        body: { enabled: true }
    });

    t.deepEqual(request.body, { enabled: true });
    t.throws(() => validateRouteRequest({ body: z.object({ enabled: z.boolean() }) }, { body: { enabled: "yes" } as any }), {
        instanceOf: RouteValidationError,
        message: "Invalid route body"
    });
});

test("preserves unschematized route request locations", t => {
    const request = validateRouteRequest({}, {
        params: { id: "seq-1" },
        query: { limit: "10" },
        headers: { authorization: "Bearer token" },
        body: { enabled: true }
    });

    t.deepEqual(request, {
        params: { id: "seq-1" },
        query: { limit: "10" },
        headers: { authorization: "Bearer token" },
        body: { enabled: true }
    });
});

test("validates route responses", t => {
    const response = validateRouteResponse({ response: z.object({ ok: z.boolean() }) }, { ok: true });

    t.deepEqual(response, { ok: true });
    t.throws(() => validateRouteResponse({ response: z.object({ ok: z.boolean() }) }, { ok: "true" }), {
        instanceOf: RouteValidationError,
        message: "Invalid route response"
    });
});
