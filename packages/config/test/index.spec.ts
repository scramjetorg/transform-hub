import test from "ava";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
    createOptionRegistry,
    formatZodError,
    loadConfig,
    maskConfig,
    mergeConfig,
    sthOutboundVerser2ConfigSchema,
    sthOutboundVerser2Options,
    parseCliOptions,
    z
} from "../src";

const schema = z.object({
    feature: z.object({
        enabled: z.boolean(),
        retries: z.number(),
        label: z.string(),
        tags: z.array(z.string()),
        payload: z.object({ value: z.string() }).optional()
    }),
    secret: z.string()
}).strict();

const options = [
    { name: "enabled", path: "feature.enabled", type: "boolean" as const, env: "FEATURE_ENABLED" },
    { name: "retries", path: "feature.retries", type: "number" as const, env: "FEATURE_RETRIES" },
    { name: "label", path: "feature.label", type: "string" as const, env: "FEATURE_LABEL" },
    { name: "tags", path: "feature.tags", type: "string[]" as const, env: "FEATURE_TAGS", multiple: true },
    { name: "payload", path: "feature.payload", type: "json" as const },
    { name: "secret", path: "secret", type: "string" as const, env: "FEATURE_SECRET", secret: true }
];

test("loads config sources with documented precedence", t => {
    const dir = mkdtempSync(join(tmpdir(), "scramjet-config-"));
    const configPath = join(dir, "config.yaml");
    const packageJsonPath = join(dir, "package.json");
    const dotenvPath = join(dir, ".env");

    writeFileSync(configPath, "feature:\n  retries: 2\n  label: file\n  tags:\n    - file\nsecret: file-secret\n");
    writeFileSync(packageJsonPath, JSON.stringify({ scramjet: { feature: { label: "package" } } }));
    writeFileSync(dotenvPath, "FEATURE_LABEL=dotenv\nFEATURE_RETRIES=3\n");

    const loaded = loadConfig<z.infer<typeof schema>>({
        schema,
        defaults: { feature: { enabled: true, retries: 1, label: "default", tags: ["default"] }, secret: "default-secret" },
        configFilePath: configPath,
        packageJsonPath,
        packageJsonSection: "scramjet",
        dotenvPath,
        env: { FEATURE_LABEL: "env", FEATURE_TAGS: "env-a,env-b" },
        cli: { label: "cli", payload: { value: "cli" } },
        overrides: { feature: { retries: 9 } },
        options
    });

    t.deepEqual(loaded.config, {
        feature: {
            enabled: true,
            retries: 9,
            label: "cli",
            tags: ["env-a", "env-b"],
            payload: { value: "cli" }
        },
        secret: "file-secret"
    });
});

test("merge preserves valid falsy values and replaces arrays", t => {
    const merged = mergeConfig(
        { enabled: true, count: 3, label: "default", tags: ["a"] },
        { enabled: false, count: 0, label: "", tags: [] }
    );

    t.deepEqual(merged, { enabled: false, count: 0, label: "", tags: [] });
});

test("masks secret descriptor paths", t => {
    const masked = maskConfig({ secret: "super-secret", public: "ok" }, [
        { name: "secret", secret: true }
    ]);

    t.deepEqual(masked, { secret: "********", public: "ok" });
});

test("parses cli options without exposing parser types", t => {
    const registry = createOptionRegistry()
        .option({ name: "enabled", type: "boolean" })
        .option({ name: "retries", short: "r", type: "number" })
        .option({ name: "tags", type: "string[]", multiple: true })
        .option({ name: "payload", type: "json" });

    const parsed = parseCliOptions({
        argv: ["node", "script", "--enabled", "-r", "5", "--tags", "a", "--tags", "b", "--payload", "{\"value\":\"x\"}"],
        options: registry.getOptions()
    });

    t.deepEqual(parsed, {
        enabled: true,
        retries: 5,
        tags: ["a", "b"],
        payload: { value: "x" }
    });
});

test("parses boolean cli options — absent without default omitted", t => {
    const parsed = parseCliOptions({
        argv: ["node", "script"],
        options: [{ name: "enabled", type: "boolean" }]
    });

    t.false("enabled" in parsed);
});

test("parses boolean cli options — explicit flag sets true", t => {
    const parsed = parseCliOptions({
        argv: ["node", "script", "--enabled"],
        options: [{ name: "enabled", type: "boolean" }]
    });

    t.true(parsed.enabled);
});

test("parses boolean cli options — absent with explicit default uses default", t => {
    const parsed = parseCliOptions({
        argv: ["node", "script"],
        options: [{ name: "enabled", type: "boolean", defaultValue: true }]
    });

    t.true(parsed.enabled);
});

test("parses boolean cli options — --no-flag sets false when default present", t => {
    const parsed = parseCliOptions({
        argv: ["node", "script", "--no-enabled"],
        options: [{ name: "enabled", type: "boolean", defaultValue: true }]
    });

    t.false(parsed.enabled);
});

test("supports compatibility aliases before validation", t => {
    const loaded = loadConfig<z.infer<typeof schema>>({
        schema,
        defaults: { feature: { enabled: true, retries: 1, label: "default", tags: [] }, secret: "secret" },
        overrides: { oldFeature: { label: "legacy" } },
        aliases: { oldFeature: "feature" },
        options
    });

    t.is(loaded.config.feature.label, "legacy");
});

test("formats validation errors", t => {
    const error = t.throws(() => schema.parse({ feature: { enabled: "yes" }, secret: "x" }));

    t.true(error instanceof z.ZodError);
    t.true(formatZodError(error as z.ZodError).includes("feature.enabled"));
});

test("verser2 descriptors map env cli aliases and mask secrets", t => {
    const schemaWithVerser2 = z.object({ verser2: sthOutboundVerser2ConfigSchema }).strict();
    const loaded = loadConfig<z.infer<typeof schemaWithVerser2>>({
        schema: schemaWithVerser2,
        defaults: {
            verser2: {
                enabled: false,
                migrationMode: "legacy",
                hostUrl: "",
                broker: { peerId: "", targetDomain: "" },
                guest: { peerId: "", routeDomain: "" },
                tls: {},
                enrollment: {},
                timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 1000, requestMs: 1000 },
                leases: { minimumWaitingLeases: 1 }
            }
        },
        env: {
            SCRAMJET_VERSER2_HOST_URL: "https://manager.example:2443",
            CPM_SSL_CA_PATH: "/ca/from-alias.pem",
            SCRAMJET_VERSER2_CERT_FILE: "/safe/cert.pem",
            SCRAMJET_VERSER2_KEY_FILE: "/secret/key.pem"
        },
        cli: {
            verser2Enabled: true,
            verser2MigrationMode: "dual",
            verser2CaFile: "/ca/from-cli.pem",
            verser2BrokerPeerId: "sth.a.broker",
            verser2BrokerTargetDomain: "manager.a.scramjet.internal",
            verser2GuestPeerId: "sth.a.guest",
            verser2GuestRouteDomain: "sth.a.scramjet.internal"
        },
        options: sthOutboundVerser2Options
    });

    t.true(loaded.config.verser2.enabled);
    t.is(loaded.config.verser2.migrationMode, "dual");
    t.is(loaded.config.verser2.hostUrl, "https://manager.example:2443");
    t.is(loaded.config.verser2.tls.caFile, "/ca/from-cli.pem");
    t.is(loaded.config.verser2.tls.keyFile, "/secret/key.pem");
    t.is((loaded.publicConfig as any).verser2.tls.keyFile, "********");
});

test("verser2 schema requires usable routed config in verser2 mode", t => {
    const error = t.throws(() => sthOutboundVerser2ConfigSchema.parse({
        enabled: true,
        migrationMode: "verser2",
        hostUrl: "",
        broker: { peerId: "", targetDomain: "" },
        guest: { peerId: "", routeDomain: "" },
        tls: {},
        enrollment: {},
        timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 1000, requestMs: 1000 },
        leases: { minimumWaitingLeases: 1 }
    }));

    t.true(error instanceof z.ZodError);
    t.deepEqual((error as z.ZodError).issues.map(issue => issue.path.join(".")), [
        "hostUrl",
        "broker.peerId",
        "broker.targetDomain",
        "guest.peerId",
        "guest.routeDomain"
    ]);
});

test("verser2 schema requires PEM cert and key together", t => {
    const certOnly = t.throws(() => sthOutboundVerser2ConfigSchema.parse({
        enabled: false,
        migrationMode: "legacy",
        hostUrl: "",
        broker: { peerId: "", targetDomain: "" },
        guest: { peerId: "", routeDomain: "" },
        tls: { certFile: "/safe/cert.pem" },
        enrollment: {},
        timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 1000, requestMs: 1000 },
        leases: { minimumWaitingLeases: 1 }
    }));
    const keyOnly = t.throws(() => sthOutboundVerser2ConfigSchema.parse({
        enabled: false,
        migrationMode: "legacy",
        hostUrl: "",
        broker: { peerId: "", targetDomain: "" },
        guest: { peerId: "", routeDomain: "" },
        tls: { keyFile: "/secret/key.pem" },
        enrollment: {},
        timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 1000, requestMs: 1000 },
        leases: { minimumWaitingLeases: 1 }
    }));

    t.is((certOnly as z.ZodError).issues[0].path.join("."), "tls.keyFile");
    t.is((keyOnly as z.ZodError).issues[0].path.join("."), "tls.certFile");
});

test("verser2 schema rejects invalid migration mode", t => {
    const error = t.throws(() => sthOutboundVerser2ConfigSchema.parse({
        enabled: true,
        migrationMode: "invalid",
        hostUrl: "https://manager.example:2443",
        broker: { peerId: "sth.a.broker", targetDomain: "manager.a.scramjet.internal" },
        guest: { peerId: "sth.a.guest", routeDomain: "sth.a.scramjet.internal" },
        tls: {},
        enrollment: {},
        timeouts: { routeReadinessMs: 1000, leaseAcquireMs: 1000, requestMs: 1000 },
        leases: { minimumWaitingLeases: 1 }
    }));

    t.true(error instanceof z.ZodError);
});
