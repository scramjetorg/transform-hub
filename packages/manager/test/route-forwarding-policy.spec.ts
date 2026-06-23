import test from "ava";

import { decideRouteForwardingPolicy } from "../src/lib/route-forwarding-policy";

test("decideRouteForwardingPolicy tunnels local and downward sequence routes", t => {
    t.deepEqual(decideRouteForwardingPolicy({
        routeDomain: "runner.instance-1.scramjet.internal",
        targetPath: "/api/v1/rpc/test/abc",
        origin: "local-api"
    }), { action: "tunnel", direction: "local" });

    t.deepEqual(decideRouteForwardingPolicy({
        routeDomain: "sth.hub-2.scramjet.internal",
        targetPath: "/instance/hub-2-api-main/rpc/test/abc",
        origin: "manager-downward"
    }), { action: "tunnel", direction: "downward" });
});

test("decideRouteForwardingPolicy semi-denies external upward Manager routes", t => {
    t.deepEqual(decideRouteForwardingPolicy({
        routeDomain: "manager.space-1.scramjet.internal",
        targetPath: "/api/v1/list",
        origin: "external-api"
    }), { action: "return-redirect", direction: "upward" });
});

test("decideRouteForwardingPolicy allows trusted runtime upward Manager routes", t => {
    t.deepEqual(decideRouteForwardingPolicy({
        routeDomain: "manager.space-1.scramjet.internal",
        targetPath: "/api/v1/sth/hub-2/instance/hub-2-api-main/rpc/test/abc",
        origin: "runtime-sequence"
    }), { action: "tunnel", direction: "upward" });
});
