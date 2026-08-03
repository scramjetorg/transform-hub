import test from "ava";

import { parseRoutedRedirect } from "../src/handlers/routed-redirect";

test("parseRoutedRedirect extracts route metadata from a 308 response", t => {
    const result = parseRoutedRedirect({
        statusCode: 308,
        headers: {
            location: "http://sth.hub-1.scramjet.internal/rpc/test/abc",
            "x-scramjet-route-decision": "redirect",
            "x-scramjet-route-domain": "sth.hub-1.scramjet.internal",
            "x-scramjet-route-target-path": "/rpc/test/abc"
        }
    });

    t.deepEqual(result, {
        kind: "redirect",
        location: "http://sth.hub-1.scramjet.internal/rpc/test/abc",
        routeDomain: "sth.hub-1.scramjet.internal",
        targetPath: "/rpc/test/abc"
    });
});

test("parseRoutedRedirect rejects incomplete or unknown route metadata", t => {
    t.deepEqual(parseRoutedRedirect({ statusCode: 200, headers: {} }), { kind: "none" });
    t.deepEqual(parseRoutedRedirect({
        statusCode: 308,
        headers: { "x-scramjet-route-decision": "redirect", "x-scramjet-route-domain": "sth.hub-1.scramjet.internal" }
    }), { kind: "invalid", reason: "missing-target-path" });
    t.deepEqual(parseRoutedRedirect({
        statusCode: 308,
        headers: {
            "x-scramjet-route-decision": "unknown",
            "x-scramjet-route-domain": "sth.hub-1.scramjet.internal",
            "x-scramjet-route-target-path": "/rpc/test/abc"
        }
    }), { kind: "invalid", reason: "unknown-decision" });
});
