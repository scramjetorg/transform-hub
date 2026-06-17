import test from "ava";

import { RouteHook, createRouter, executeRoutePipeline, headerHook } from "../src";

const route = createRouter().get("/test").definitions()[0];
const request = { params: undefined, query: undefined, headers: undefined, body: undefined };

test("route pipeline executes before, after and finally hooks in order", async t => {
    const calls: string[] = [];
    const hooks: RouteHook[] = [{
        before(context) {
            context.state.before = true;
            calls.push("before");
        },
        after(context) {
            calls.push(`after:${String(context.response)}`);
            return "changed";
        },
        finally() {
            calls.push("finally");
        }
    }];

    const response = await executeRoutePipeline(route, request, context => {
        calls.push(`handler:${String(context.state.before)}`);
        return "ok";
    }, { hooks });

    t.is(response, "changed");
    t.deepEqual(calls, ["before", "handler:true", "after:ok", "finally"]);
});

test("route pipeline supports before short-circuit and error recovery", async t => {
    t.is(await executeRoutePipeline(route, request, () => "unreachable", {
        hooks: [{ before: () => "short" }]
    }), "short");

    t.is(await executeRoutePipeline(route, request, () => {
        throw new Error("boom");
    }, {
        hooks: [{ error: context => `handled:${(context.error as Error).message}` }]
    }), "handled:boom");
});

test("headerHook stores response headers in hook state", async t => {
    let state: Record<string, unknown> = {};

    await executeRoutePipeline(route, request, () => "ok", {
        hooks: [headerHook({ "x-test": "true" }), { after: context => { state = context.state; } }]
    });

    t.deepEqual(state.headers, { "x-test": "true" });
});
