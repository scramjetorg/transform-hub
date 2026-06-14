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
