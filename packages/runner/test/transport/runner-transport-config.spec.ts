import test from "ava";
import {
    parseRunnerTransportConfig,
    RunnerTransportConfigVerser2
} from "../../src/transport/runner-transport-config";

const TEST_ID = "550e8400-e29b-41d4-a716-446655440000";
const DEFAULT_ROUTE_DOMAIN = `runner.${TEST_ID}.scramjet.internal`;
const DEFAULT_GUEST_ID = `runner.${TEST_ID}.guest`;
const DEFAULT_HUB_BROKER_ID = `runner.${TEST_ID}.hub.broker`;

// ---------------------------------------------------------------------------
// Absent / empty / whitespace env => fail closed
// ---------------------------------------------------------------------------

test("throws when envValue is undefined", t => {
    const original = process.env.SCRAMJET_RUNNER_TRANSPORT_CONFIG;

    delete process.env.SCRAMJET_RUNNER_TRANSPORT_CONFIG;
    const err = t.throws<Error>(() => parseRunnerTransportConfig(TEST_ID, undefined));

    if (original === undefined) {
        delete process.env.SCRAMJET_RUNNER_TRANSPORT_CONFIG;
    } else {
        process.env.SCRAMJET_RUNNER_TRANSPORT_CONFIG = original;
    }
    t.regex(err!.message, /SCRAMJET_RUNNER_TRANSPORT_CONFIG is required/);
});

test("throws when envValue is empty string", t => {
    const err = t.throws<Error>(() => parseRunnerTransportConfig(TEST_ID, ""));

    t.regex(err!.message, /SCRAMJET_RUNNER_TRANSPORT_CONFIG is required/);
});

test("throws when envValue is whitespace only", t => {
    const err = t.throws<Error>(() => parseRunnerTransportConfig(TEST_ID, "   "));

    t.regex(err!.message, /SCRAMJET_RUNNER_TRANSPORT_CONFIG is required/);
});

test("rejects retired raw socket transport kind", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ kind: "retired-raw-socket" }));
    });

    t.truthy(err);
    t.regex(err!.message, /unknown kind/);
});

test("throws when JSON object has no kind", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ hostUrl: "http://example.com" }));
    });

    t.truthy(err);
    t.regex(err!.message, /unknown kind/);
});

// ---------------------------------------------------------------------------
// verser2 — valid configs
// ---------------------------------------------------------------------------

test("returns verser2 config with minimal valid env", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com:443" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.kind, "verser2");
    t.is(result.hostUrl, "https://verser2.example.com:443");
    t.is(result.routeDomain, DEFAULT_ROUTE_DOMAIN);
    t.is(result.guestId, DEFAULT_GUEST_ID);
    t.is(result.hubBrokerId, DEFAULT_HUB_BROKER_ID);
    t.is(result.hubTargetDomain, undefined);
    t.is(result.spaceTargetDomain, undefined);
    t.is(result.tls, undefined);
    t.is(result.leaseAcquireTimeoutMs, undefined);
    t.is(result.minWaitingStreams, undefined);
});

test("returns verser2 config with custom guestId", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com:443", guestId: "custom.guest" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.kind, "verser2");
    t.is(result.guestId, "custom.guest");
    t.is(result.routeDomain, DEFAULT_ROUTE_DOMAIN);
});

test("returns verser2 config with custom routeDomain", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com:443", routeDomain: "custom.domain.internal" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.kind, "verser2");
    t.is(result.routeDomain, "custom.domain.internal");
    t.is(result.guestId, DEFAULT_GUEST_ID);
});

test("returns verser2 config with all optional fields", t => {
    const env = {
        kind: "verser2",
        hostUrl: "https://verser2.example.com:443",
        guestId: "my.guest",
        routeDomain: "my.domain.internal",
        hubBrokerId: "my.hub.broker",
        hubTargetDomain: "sth.domain.internal",
        spaceTargetDomain: "manager.domain.internal",
        tls: { caFile: "/etc/ca.pem", certFile: "/etc/cert.pem", keyFile: "/etc/key.pem" },
        leaseAcquireTimeoutMs: 5000,
        minWaitingStreams: 3
    };

    const result = parseRunnerTransportConfig(TEST_ID, JSON.stringify(env)) as RunnerTransportConfigVerser2;

    t.is(result.kind, "verser2");
    t.is(result.hostUrl, "https://verser2.example.com:443");
    t.is(result.guestId, "my.guest");
    t.is(result.routeDomain, "my.domain.internal");
    t.is(result.hubBrokerId, "my.hub.broker");
    t.is(result.hubTargetDomain, "sth.domain.internal");
    t.is(result.spaceTargetDomain, "manager.domain.internal");
    t.deepEqual(result.tls, { caFile: "/etc/ca.pem", certFile: "/etc/cert.pem", keyFile: "/etc/key.pem" });
    t.is(result.leaseAcquireTimeoutMs, 5000);
    t.is(result.minWaitingStreams, 3);
});

test("returns verser2 config with inline TLS CA preferred over CA file", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({
            kind: "verser2",
            hostUrl: "https://verser2.example.com",
            tls: {
                ca: "  -----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----  ",
                caFile: "/etc/ca.pem",
                certFile: "/etc/cert.pem"
            }
        })
    ) as RunnerTransportConfigVerser2;

    t.deepEqual(result.tls, {
        ca: "-----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----",
        certFile: "/etc/cert.pem"
    });
});

test("trims hostUrl whitespace", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "  https://verser2.example.com  " })
    ) as RunnerTransportConfigVerser2;

    t.is(result.hostUrl, "https://verser2.example.com");
});

test("trims guestId whitespace", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", guestId: "  padded.guest  " })
    ) as RunnerTransportConfigVerser2;

    t.is(result.guestId, "padded.guest");
});

test("trims routeDomain whitespace", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", routeDomain: "  padded.domain  " })
    ) as RunnerTransportConfigVerser2;

    t.is(result.routeDomain, "padded.domain");
});

// ---------------------------------------------------------------------------
// verser2 — validation errors
// ---------------------------------------------------------------------------

test("throws when verser2 config has no hostUrl", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ kind: "verser2" }));
    });

    t.truthy(err);
    t.regex(err!.message, /hostUrl is required/);
});

test("throws when verser2 hostUrl is empty string", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ kind: "verser2", hostUrl: "" }));
    });

    t.truthy(err);
    t.regex(err!.message, /hostUrl is required/);
});

test("throws when verser2 hostUrl is whitespace", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ kind: "verser2", hostUrl: "   " }));
    });

    t.truthy(err);
    t.regex(err!.message, /hostUrl is required/);
});

test("throws when verser2 hostUrl is non-string", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ kind: "verser2", hostUrl: 123 }));
    });

    t.truthy(err);
    t.regex(err!.message, /hostUrl is required/);
});

// ---------------------------------------------------------------------------
// Invalid JSON
// ---------------------------------------------------------------------------

test("throws on malformed JSON", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, "not valid json");
    });

    t.truthy(err);
    t.regex(err!.message, /invalid JSON/);
});

test("throws on JSON primitive (non-object)", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, "\"just a string\"");
    });

    t.truthy(err);
    t.regex(err!.message, /expected a JSON object/);
});

test("throws on JSON null", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, "null");
    });

    t.truthy(err);
    t.regex(err!.message, /expected a JSON object/);
});

test("throws on JSON array", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, "[]");
    });

    t.truthy(err);
    t.regex(err!.message, /expected a JSON object/);
});

// ---------------------------------------------------------------------------
// Unknown kind
// ---------------------------------------------------------------------------

test("throws on unknown kind", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig(TEST_ID, JSON.stringify({ kind: "unknown" }));
    });

    t.truthy(err);
    t.regex(err!.message, /unknown kind/);
});

test("throws when instanceId is empty", t => {
    const err = t.throws<Error>(() => {
        parseRunnerTransportConfig("", JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com" }));
    });

    t.truthy(err);
    t.regex(err!.message, /instanceId is required/);
});

// ---------------------------------------------------------------------------
// GuestId edge cases
// ---------------------------------------------------------------------------

test("guestId defaults when guestId is empty string in JSON", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", guestId: "" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.guestId, DEFAULT_GUEST_ID);
});

test("guestId defaults when guestId is whitespace in JSON", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", guestId: "  " })
    ) as RunnerTransportConfigVerser2;

    t.is(result.guestId, DEFAULT_GUEST_ID);
});

// ---------------------------------------------------------------------------
// routeDomain edge cases
// ---------------------------------------------------------------------------

test("routeDomain defaults when routeDomain is empty string in JSON", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", routeDomain: "" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.routeDomain, DEFAULT_ROUTE_DOMAIN);
});

test("routeDomain defaults when routeDomain is whitespace in JSON", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", routeDomain: "   " })
    ) as RunnerTransportConfigVerser2;

    t.is(result.routeDomain, DEFAULT_ROUTE_DOMAIN);
});

// ---------------------------------------------------------------------------
// Different instanceId produces different defaults
// ---------------------------------------------------------------------------

test("different instanceId produces different defaults", t => {
    const id2 = "660e8400-e29b-41d4-a716-446655440001";
    const result = parseRunnerTransportConfig(
        id2,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.routeDomain, `runner.${id2}.scramjet.internal`);
    t.is(result.guestId, `runner.${id2}.guest`);
});

// ---------------------------------------------------------------------------
// Numeric fields: zero values are valid
// ---------------------------------------------------------------------------

test("leaseAcquireTimeoutMs 0 is preserved", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", leaseAcquireTimeoutMs: 0 })
    ) as RunnerTransportConfigVerser2;

    t.is(result.leaseAcquireTimeoutMs, 0);
});

test("minWaitingStreams 0 is preserved", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", minWaitingStreams: 0 })
    ) as RunnerTransportConfigVerser2;

    t.is(result.minWaitingStreams, 0);
});

test("non-numeric leaseAcquireTimeoutMs is ignored", t => {
    const result = parseRunnerTransportConfig(
        TEST_ID,
        JSON.stringify({ kind: "verser2", hostUrl: "https://verser2.example.com", leaseAcquireTimeoutMs: "5000" })
    ) as RunnerTransportConfigVerser2;

    t.is(result.leaseAcquireTimeoutMs, undefined);
});
