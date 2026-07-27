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
    generateExecutableHelp,
    isHelpRequested,
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

test("detects executable help flags before positional separator", t => {
    t.true(isHelpRequested(["node", "bin", "--help"]));
    t.true(isHelpRequested(["node", "bin", "-h"]));
    t.false(isHelpRequested(["node", "bin", "--", "--help"]));
    t.false(isHelpRequested(["node", "bin", "run"]));
});

test("generates executable help from config descriptors", t => {
    const help = generateExecutableHelp({
        name: "example",
        usage: "<file> [options...]",
        description: "Example executable.",
        arguments: [{ name: "file", description: "Input file" }],
        options: [
            { name: "configPath", flag: "config-path", short: "c", type: "string", description: "Config path", env: "CONFIG_PATH" },
            { name: "mode", flag: "mode", type: "string", description: "Run mode", choices: ["dev", "prod"], defaultValue: "dev" },
            { name: "colors", flag: "colors", type: "boolean", description: "Enable colors", defaultValue: true, negatable: true }
        ]
    });

    t.true(help.includes("Usage: example <file> [options...]"));
    t.true(help.includes("Example executable."));
    t.true(help.includes("file  Input file"));
    t.true(help.includes("-c, --config-path <value>  Config path Env: CONFIG_PATH"));
    t.true(help.includes("--mode <value>  Run mode Allowed: dev, prod Default: dev"));
    t.true(help.includes("--colors, --no-colors  Enable colors Default: true"));
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

test("verser2 descriptors preserve an explicit legacy runner Host port and mask secrets", t => {
    const schemaWithVerser2 = z.object({ verser2: sthOutboundVerser2ConfigSchema }).strict();
    const loaded = loadConfig<z.infer<typeof schemaWithVerser2>>({
        schema: schemaWithVerser2,
        defaults: {
            verser2: {
                enabled: false,
                hostUrl: "",
                runnerHost: {
                    enabled: false,
                    identityDir: "/tmp/sth-runner-host",
                    host: {
                        bindHost: "127.0.0.1",
                        bindPort: 2444,
                        publicUrl: "https://127.0.0.1:2444",
                        tls: { mtlsRequired: false }
                    },
                    registration: { allowedClientFingerprints: [] },
                    localBroker: { peerId: "auto" }
                },
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
            SCRAMJET_VERSER2_CA: "-----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----",
            SCRAMJET_VERSER2_RUNNER_HOST_PUBLIC_URL: "https://sth-local.example:2444",
            SCRAMJET_VERSER2_RUNNER_MINIMUM_WAITING_STREAMS: "40",
            CPM_SSL_CA_PATH: "/ca/from-alias.pem",
            SCRAMJET_VERSER2_CERT_FILE: "/safe/cert.pem",
            SCRAMJET_VERSER2_KEY_FILE: "/secret/key.pem"
        },
        cli: {
            verser2Enabled: true,
            verser2CaFile: "/ca/from-cli.pem",
            verser2RunnerHostEnabled: true,
            verser2RunnerHostCertFile: "/safe/runner.crt",
            verser2RunnerHostKeyFile: "/secret/runner.key",
            verser2BrokerPeerId: "sth.a.broker",
            verser2BrokerTargetDomain: "manager.a.scramjet.internal",
            verser2GuestPeerId: "sth.a.guest",
            verser2GuestRouteDomain: "sth.a.scramjet.internal",
            verser2UpstreamMinimumWaitingStreams: 160
        },
        options: sthOutboundVerser2Options
    });

    t.true(loaded.config.verser2.enabled);
    t.is(loaded.config.verser2.hostUrl, "https://manager.example:2443");
    t.is(loaded.config.verser2.runnerHost?.enabled, true);
    t.is(loaded.config.verser2.runnerHost?.host.publicUrl, "https://sth-local.example:2444");
    t.is(loaded.config.verser2.runnerHost?.host.tls.keyFile, "/secret/runner.key");
    t.is(loaded.config.verser2.tls.ca, "-----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----");
    t.is(loaded.config.verser2.tls.caFile, "/ca/from-cli.pem");
    t.is(loaded.config.verser2.tls.keyFile, "/secret/key.pem");
    t.is(loaded.config.verser2.leases.minimumRunnerWaitingStreams, 40);
    t.is(loaded.config.verser2.leases.minimumUpstreamWaitingStreams, 160);
    t.is((loaded.publicConfig as any).verser2.tls.keyFile, "********");
    t.is((loaded.publicConfig as any).verser2.runnerHost.host.tls.keyFile, "********");
    t.is((loaded.publicConfig as any).verser2.tls.ca, "-----BEGIN CERTIFICATE-----\ninline\n-----END CERTIFICATE-----");

    const runnerBrokerPeerIdOption = sthOutboundVerser2Options.find(option => option.name === "verser2RunnerHostBrokerPeerId");

    t.true(Boolean(runnerBrokerPeerIdOption?.description?.includes("auto")));
});

test("verser2 schema requires usable routed config in verser2 mode", t => {
    const error = t.throws(() => sthOutboundVerser2ConfigSchema.parse({
        enabled: true,
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

test("readConfigFile parses JSONC with comments and trailing commas", t => {
    const dir = mkdtempSync(join(tmpdir(), "scramjet-config-jsonc-"));
    const configPath = join(dir, "config.jsonc");

    writeFileSync(configPath, `{
        // comment
        "feature": {
            "enabled": true,
            "retries": 5,
            "label": "jsonc-file",
            "tags": [
                "tag1",
                "tag2",
            ],
        },
        "secret": "jsonc-secret",
    }`);

    const loaded = loadConfig<z.infer<typeof schema>>({
        schema,
        defaults: { feature: { enabled: false, retries: 1, label: "default", tags: [] }, secret: "" },
        configFilePath: configPath,
        options
    });

    t.true(loaded.config.feature.enabled);
    t.is(loaded.config.feature.retries, 5);
    t.is(loaded.config.feature.label, "jsonc-file");
    t.deepEqual(loaded.config.feature.tags, ["tag1", "tag2"]);
    t.is(loaded.config.secret, "jsonc-secret");
});

test("loadConfig returns publicConfig with masked secrets", t => {
    const loaded = loadConfig<z.infer<typeof schema>>({
        schema,
        defaults: { feature: { enabled: true, retries: 1, label: "default", tags: [] }, secret: "my-secret" },
        options
    });

    t.is((loaded.publicConfig as any).secret, "********");
    t.is((loaded.publicConfig as any).feature.enabled, true);
});

test("loadConfig with empty config file returns defaults", t => {
    const dir = mkdtempSync(join(tmpdir(), "scramjet-config-empty-"));
    const configPath = join(dir, "config.yaml");

    writeFileSync(configPath, "");

    const loaded = loadConfig<z.infer<typeof schema>>({
        schema,
        defaults: { feature: { enabled: true, retries: 1, label: "default", tags: [] }, secret: "default-secret" },
        configFilePath: configPath,
        options
    });

    t.true(loaded.config.feature.enabled);
    t.is(loaded.config.feature.retries, 1);
    t.is(loaded.config.secret, "default-secret");
});
