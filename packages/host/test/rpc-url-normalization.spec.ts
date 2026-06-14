import test from "ava";

import { normalizeRpcForwardPath, stripRpcExposePath } from "../src/lib/api/host-api";

test("normalizeRpcForwardPath adds /api/v1 for host v1 short RPC paths", t => {
    t.is(
        normalizeRpcForwardPath("/users/1?expand=1", "/api/v1/users", "v1"),
        "/api/v1/users/1?expand=1"
    );
});

test("normalizeRpcForwardPath preserves explicit /api/v1 RPC paths", t => {
    t.is(
        normalizeRpcForwardPath("/api/v1/users/1", "/api/v1/users", "v1"),
        "/api/v1/users/1"
    );
});

test("normalizeRpcForwardPath keeps short path when exposed version differs", t => {
    t.is(
        normalizeRpcForwardPath("/users/1", "/api/v2/users", "v1"),
        "/users/1"
    );
});

test("stripRpcExposePath removes exposed prefix and preserves query-only suffix", t => {
    t.is(stripRpcExposePath("/api/v1/users/1", "/api/v1/users"), "/1");
    t.is(stripRpcExposePath("/api/v1/users?expand=1", "/api/v1/users"), "/?expand=1");
});
