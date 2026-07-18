import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";

import testBase from "ava";
import ts from "typescript";

import {
    createHealthControlFacade,
    createHubHarness,
    createSequenceTest
} from "../src";

const { allowAvaMemoryGrowth, createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof testBase = createAvaMemoryGuard(testBase);

const repoRoot = path.resolve(__dirname, "../../..");
const docs = (...parts: string[]) => readFileSync(path.join(repoRoot, "docs-source", ...parts), "utf8");
const wetPages = [
    "lifecycle-local-validation-service.md",
    "customer-site-health-control.md",
    "mcp-bridged-job-status.md",
    "local-object-filter-to-consumer.md",
    "customer-site-topic-probe-pipeline.md",
    "tested-incremental-log-aggregator.md",
    "app-context-health-parity.md",
    "source-side-data-summary.md"
];

function fenced(markdown: string, language: string): string[] {
    const fence = "```";
    return [...markdown.matchAll(new RegExp(`${fence}${language}\\n([\\s\\S]*?)${fence}`, "g"))]
        .map(match => match[1]);
}

function typeCheckTypeScriptSnippets(snippets: string[], name: string): string[] {
    const directory = mkdtempSync(path.join(os.tmpdir(), "sth-phase6-ts-"));
    const sourcePaths = snippets.map((snippet, index) => {
        const sourcePath = path.join(directory, `${name}-${index}.ts`);
        const prelude = `${snippet.includes('from "node:stream"') || snippet.includes('from "stream"') ? "" : "type Readable = any;\n"}declare const Transform: any;\ndeclare const transform: any;\ndeclare const through2: any;\n${snippet.includes("const fixture") ? "" : "declare const fixture: any;\n"}`;
        writeFileSync(sourcePath, `${prelude}${snippet}`);
        return sourcePath;
    });
    const shimPath = path.join(directory, "phase6-modules.d.ts");
    // The bridge is intentionally a separately installed application. Keep its
    // SDK declarations local to this extraction check while resolving all Hub
    // and sequence imports against the repository's real source/type programs.
    writeFileSync(shimPath, `
declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  export class McpServer {
    constructor(options: { name: string; version: string });
    registerTool(name: string, config: { description: string; inputSchema: unknown }, handler: (input: any) => Promise<any>): void;
    connect(transport: unknown): Promise<void>;
  }
}
declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {}
}
declare module "through2" { const through2: any; export default through2; }
`);
    try {
        const options: ts.CompilerOptions = {
            // These are extracted documentation fragments, not standalone
            // modules. Keep strict checking and real module/type resolution;
            // the prelude supplies only names that a surrounding guide would
            // normally provide (fixture helpers and stream constructors).
            strict: true,
            target: ts.ScriptTarget.ES2019,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            esModuleInterop: true,
            skipLibCheck: true,
            noUnusedLocals: false,
            baseUrl: repoRoot,
            paths: {
                "@scramjet/*": ["packages/*/src/index.ts"],
                zod: ["node_modules/zod/index.d.ts"]
            }
        };
        const program = ts.createProgram([...sourcePaths, shimPath], options);
        return ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
}

test("lifecycle progression keeps validation before exposure and starts fresh after failure", async t => {
    allowAvaMemoryGrowth(t, {
        threshold: 1024 * 1024,
        reason: "The first guarded lifecycle test loads the sequence-test harness; both synthetic instances are closed before measurement."
    });
    const sequence = await createSequenceTest({ runtime: "node", sequencePath: "/tmp/phase6-lifecycle.js" });
    t.is(sequence.state(), "created");

    await t.throwsAsync(sequence.initialize(), { message: /requires validation/ });
    t.is(sequence.state(), "errored");
    t.deepEqual(sequence.activeRoutes(), []);
    t.deepEqual(sequence.events().map(event => event.diagnostic.code), ["INITIALIZE_REJECTED"]);

    const restarted = await sequence.restart();
    await restarted.validate();
    await restarted.initialize();
    await restarted.activateRoute("/status");
    t.is(restarted.state(), "ready");
    t.deepEqual(restarted.activeRoutes(), ["/status"]);

    await sequence.close();
    await restarted.close();
});

test("control progression preserves health details and distinguishes stop, kill, and error", async t => {
    const control = createHealthControlFacade();
    t.deepEqual(control.health([
        { healthy: true, details: { site: { latencyMs: 12 } } },
        { healthy: true, details: { service: { version: "1" } } }
    ]), {
        healthy: true,
        details: { service: { version: "1" }, site: { latencyMs: 12 } }
    });
    t.deepEqual(await control.stop({ timeoutMs: 25 }), { operation: "stop", outcome: "timeout", timeoutMs: 25 });
    t.deepEqual(await control.kill(), { operation: "kill", outcome: "killed" });
    t.deepEqual(await control.fail(new Error("site unavailable")), {
        operation: "error", outcome: "errored", code: "ERR_SEQUENCE"
    });
    t.deepEqual(control.lifecycle().map(entry => entry.state), ["stopping", "killing", "errored"]);
});

test("direct Hub and Manager-routed control flow is documented with terminal outcomes", t => {
    const controlGuide = docs("sequences", "sequence-control.md");
    const wetGuide = docs("examples", "customer-site-health-control.md");
    t.regex(controlGuide, /direct:\s+caller -> Hub -> instance -> terminal state/);
    t.regex(controlGuide, /routed:\s+caller -> Manager -> connected Hub -> instance -> terminal state/);
    t.regex(controlGuide, /health[\s\S]*stop[\s\S]*kill[\s\S]*timeout[\s\S]*errored/);
    t.regex(controlGuide, /`stopping`[\s\S]*`killing`[\s\S]*`completed`[\s\S]*`errored`[\s\S]*`gone`/);

    // Real Manager-routed control conformance test validates direct Hub semantics
    const conformanceTest = readFileSync(
        path.join(repoRoot, "packages/manager/test/manager-api-v2-hotwire.spec.ts"), "utf8"
    );
    t.regex(conformanceTest, /real Manager-routed CSI control preserves direct Hub semantics/);
    t.regex(conformanceTest, /InstanceStatus\.COMPLETED/);
    t.regex(conformanceTest, /RunnerMessageCode\.(STOP|KILL)/);

    t.regex(wetGuide, /bounded timeout[\s\S]*kill/);
});

test("API exposure routes are sequence-scoped; MCP example remains standalone", async t => {
    const harness = createHubHarness();
    harness.context.api.use("/status", () => ({ status: "ok" }));
    const hubStatus = await harness.context.hubClient().status.get();
    const spaceHubs = await harness.context.spaceClient().hubs.get();

    t.truthy(hubStatus.body);
    t.truthy(spaceHubs.body);
    t.deepEqual(harness.apiRoutes().map(route => route.path), ["/status"]);
    t.notRegex(docs("sequences", "sequence-api-exposure.md"), /MCP/);
    t.regex(docs("examples", "mcp-bridged-job-status.md"), /McpServer/);
    t.regex(docs("examples", "mcp-bridged-job-status.md"), /z\.string\(\)\.regex/);
    t.regex(docs("examples", "mcp-bridged-job-status.md"), /source of truth/);
    t.notRegex(docs("examples", "mcp-bridged-job-status.md"), /cursor|CURSOR_FILE|cursorFile/i);
});

test("communication and topics evidence preserves transient events and Hub/Space route boundaries", async t => {
    const harness = createHubHarness({ basePath: "/api/v2" });
    harness.context.emit("probe.completed", { id: "one" });
    harness.context.emitToSpace("probe.completed", { id: "one" });
    t.deepEqual(harness.events().map(event => event.scope), ["host", "space"]);

    const hubTopic = await harness.hub.handle({
        method: "POST", path: "/api/v2/topics", headers: { "content-type": "application/json" },
        body: { topic: { name: "probe", contentType: "text/plain" } }
    });
    const spaceCreate = await harness.hub.handle({
        method: "POST", path: "/api/v1/cpm/api/v2/topics", headers: { "content-type": "application/json" },
        body: { topic: { name: "not-created", contentType: "text/plain" } }
    });
    t.is(hubTopic.status, 200);
    t.is(spaceCreate.status, 404);
    t.regex(docs("manager", "overview.md"), /not persisted and cannot be replayed/);
    t.regex(docs("sequences", "sequence-topics.md"), /v1 compatibility/);
    t.regex(docs("sequences", "sequence-topics.md"), /api\/v2\/topics/);
    t.regex(docs("sequences", "sequence-topics.md"), /body: Readable\.from/);
});

test("AppContext guide claims name the canonical type and intentional runtime limits", t => {
    const writing = docs("sequences", "writing-sequences.md");
    const parity = docs("reference", "runtime-app-context-conformance.md");
    t.regex(writing, /@scramjet\/sequence-types/);
    t.regex(writing, /hubClient\(\)/);
    t.regex(writing, /spaceClient\(\)/);
    t.regex(parity, /Hosted Bun delegates to Node|Node delegation/);
    t.regex(parity, /Unsupported/);
    t.regex(parity, /generic Python REST SDK/);
});

test("every Phase 6 wet page has extractable contract-bearing snippets", t => {
    allowAvaMemoryGrowth(t, {
        threshold: 2 * 1024 * 1024,
        reason: "TypeScript transpilation and YAML parsing retain compiler/parser metadata for this extraction-only test."
    });
    const wetMarkdown = wetPages.map(page => docs("examples", page));
    const contractMarkdown = [
        ...wetMarkdown,
        docs("sequences", "sequence-lifecycle.md"),
        docs("sequences", "sequence-control.md"),
        docs("sequences", "sequence-api-exposure.md"),
        docs("sequences", "sequence-communication.md"),
        docs("sequences", "sequence-topics.md"),
        docs("sequences", "sequence-app-context.md"),
        docs("sequences", "writing-sequences.md"),
        docs("transform-hub", "configuration.md")
    ];
    for (const markdown of wetMarkdown) {
        t.regex(markdown, /\]\(\.\.\/[^)]*\.md(?:#[^)]*)?\)/, "wet page links to its dry guide");
    }

    const typescriptSnippets = contractMarkdown.flatMap(markdown => fenced(markdown, "typescript"));
    t.true(typescriptSnippets.length > 0);
    t.deepEqual(typeCheckTypeScriptSnippets(typescriptSnippets, "contract"), [], "inline TypeScript has type diagnostics");

    const pythonSnippets = [
        ...contractMarkdown.flatMap(markdown => fenced(markdown, "python"))
    ];
    for (const snippet of pythonSnippets) {
        const result = spawnSync("python3", ["-c", "import ast, sys; ast.parse(sys.stdin.read())"], {
            input: snippet, encoding: "utf8"
        });
        t.is(result.status, 0, result.stderr);
    }

    const mcp = docs("examples", "mcp-bridged-job-status.md");
    const mcpSnippets = fenced(mcp, "typescript").filter(snippet => snippet.includes("McpServer"));
    t.is(mcpSnippets.length, 1);
    for (const snippet of mcpSnippets) {
        t.deepEqual(typeCheckTypeScriptSnippets([snippet], "mcp-bridge"), [], "MCP TypeScript has type diagnostics");
        t.regex(snippet, /@modelcontextprotocol\/sdk\/server\/mcp\.js/);
        t.regex(snippet, /@modelcontextprotocol\/sdk\/server\/stdio\.js/);
        t.regex(snippet, /from "zod"/);
    }

    const yaml = require("yaml") as { parse: (source: string) => unknown };
    const compose = fenced(docs("transform-hub", "configuration.md"), "yaml").find(snippet => snippet.includes("services:"));
    t.truthy(compose);
    if (!compose) return;
    t.truthy(yaml.parse(compose));
    t.regex(compose, /healthcheck:/);
    t.regex(compose, /127\.0\.0\.1:8000:8000/);
    t.regex(compose, /internal: true/);
});

test("runtime evidence matches the lifecycle and monitoring documentation", t => {
    const nodeRunner = readFileSync(path.join(repoRoot, "packages/runner-node/src/bin/runner-node.ts"), "utf8");
    const pythonRunner = readFileSync(path.join(repoRoot, "packages/runner-python/src/runner_python/__main__.py"), "utf8");
    t.regex(nodeRunner, /INITIALIZE_REJECTED[\s\S]*throw error/);
    t.regex(nodeRunner, /\{ \.\.\.health, \.\.\.getMemoryUsage\(\) \}/);
    t.regex(nodeRunner, /\{ healthy: true, \.\.\.getMemoryUsage\(\) \}/);
    t.regex(pythonRunner, /INITIALIZE_REJECTED[\s\S]*return 1/);
    const monitoring = docs("sequences", "sequence-monitoring.md");
    t.regex(monitoring, /"memoryUsage": 12345678/);
    t.regex(monitoring, /"memoryMaxUsage": 23456789/);
    t.regex(monitoring, /runtime telemetry[\s\S]*not placed inside/);
    t.regex(docs("reference", "runtime-app-context-conformance.md"), /runner telemetry at top level/);
});

test("Phase 6 lifecycle, control, API/MCP, communication, topics, and AppContext wet guides provide claim-linked evidence", t => {
    // Each wet guide exists (readable, non-empty) and contains its core claim.
    const lifecycleGuide = docs("sequences", "sequence-lifecycle.md");
    t.truthy(lifecycleGuide.length);
    t.regex(lifecycleGuide, /Validate before serving/);

    // Lifecycle states section must appear before validation/readiness guidance.
    t.regex(lifecycleGuide, /## Lifecycle states[\s\S]*## Validate before serving/,
        "Lifecycle states section precedes Validate before serving");

    const controlGuide = docs("sequences", "sequence-control.md");
    t.truthy(controlGuide.length);
    t.regex(controlGuide, /Health is an observation/);

    const apiMCPGuide = docs("sequences", "sequence-api-exposure.md");
    t.truthy(apiMCPGuide.length);
    t.regex(apiMCPGuide, /sequence API owns its route/);

    const communicationGuide = docs("sequences", "sequence-communication.md");
    t.truthy(communicationGuide.length);
    t.regex(communicationGuide, /narrowest path/);

    const topicsGuide = docs("sequences", "sequence-topics.md");
    t.truthy(topicsGuide.length);
    t.regex(topicsGuide, /Topics are named live data channels/);

    const appContextGuide = docs("sequences", "sequence-app-context.md");
    t.truthy(appContextGuide.length);
    t.regex(appContextGuide, /@scramjet\/sequence-types/);

    // The dry testing page exists as the authoritative validation-evidence reference.
    const dryGuide = docs("testing", "testing-sequences.md");
    t.truthy(dryGuide.length);
    t.regex(dryGuide, /@scramjet\/sequence-test/);

    // Each wet guide links to its dry-page / validation evidence.
    t.regex(lifecycleGuide, /validation|local validation service|docs-source/);
    t.regex(lifecycleGuide, /initialize/);
    t.regex(controlGuide, /sequence monitoring|monitoring/);
    t.regex(apiMCPGuide, /owns its route|authorization assumptions/);
    t.regex(communicationGuide, /Hub\/Space|events/);
    t.regex(topicsGuide, /topic|content type/);
    t.regex(appContextGuide, /sequence-types|parity|runtime wrapper/);

    const sourceSummary = docs("examples", "source-side-data-summary.md");
    // Directory streaming: validates the configured directory path
    t.regex(sourceSummary, /async function validateDirectory\(value: unknown\): Promise<string>/);
    t.regex(sourceSummary, /if \(typeof value !== "string" \|\| !path\.isAbsolute\(value\)\)/);
    t.regex(sourceSummary, /if \(!info\.isDirectory\(\)\) throw new Error\("sourceDirectory must be a directory"\);/);
    // Streaming: opens the directory once, validates each entry and its metadata
    t.regex(sourceSummary, /import \{ opendir, stat \} from "node:fs\/promises"/);
    t.regex(sourceSummary, /for await \(const entry of directory\)/);
    t.regex(sourceSummary, /if \(!entry\.isFile\(\) \|\| path\.basename\(entry\.name\) !== entry\.name\) continue;/);
    t.regex(sourceSummary, /Number\.isSafeInteger\(info\.size\)/);
    t.regex(sourceSummary, /throw new Error\("directory entry escaped sourceDirectory"\);/);
    t.regex(sourceSummary, /throw new Error\(`invalid metadata for \$\{entry\.name\}`\);/);
    t.regex(sourceSummary, /yield \{ file: relative, bytes: info\.size, modifiedAt: info\.mtime\.toISOString\(\) \};/);
    // Validation snippet: loads, exercises, and checks readiness and health
    t.regex(sourceSummary, /export async function validateSourceSummary\(sequenceDirectory: string, sourceDirectory: string\): Promise<void>/);
    t.regex(sourceSummary, /await readiness\.validate\(\)/);
    t.regex(sourceSummary, /await readiness\.initialize\(\)/);
    t.regex(sourceSummary, /await readiness\.activateRoute\("\/health"\)/);
    t.regex(sourceSummary, /if \(readiness\.state\(\) !== "ready"\) throw new Error\("Sequence did not become ready"\);/);
});

test("configuration-resources-state guide describes the canonical source-summary model and forbids the old precompute/send-as-input model", t => {
    const configGuide = docs("sequences", "sequence-configuration-resources-state.md");

    // Canonical model: run where source is accessible, validate/open once, stream incrementally
    t.regex(configGuide, /where the source is accessible/i);
    t.regex(configGuide, /validate and open the source once/i);
    t.regex(configGuide, /stream summaries incrementally/i);
    t.regex(configGuide, /There is no separate producer/);
    t.regex(configGuide, /model containing precomputed results/);

    // Forbid the old precompute-and-send-as-input model (not the word
    // "precomputed" which appears legitimately in the canonical model).
    t.notRegex(configGuide, /send the summary as normal Sequence input/);
    t.notRegex(configGuide, /then send the summary as/);
    t.notRegex(configGuide, /precompute.*input/);

    // Adapter visibility and durable-state caveats preserved
    t.regex(configGuide, /## What the adapter can see/);
    t.regex(configGuide, /## State is application-owned/);
});
