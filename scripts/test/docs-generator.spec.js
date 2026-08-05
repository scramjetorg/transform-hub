"use strict";

const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const docs = require("../docs.js");

const repoRoot = path.resolve(__dirname, "../..");
const docsScript = path.join(repoRoot, "scripts/docs.js");

const readSourceDoc = (...parts) => fs.readFileSync(path.join(repoRoot, "docs-source", ...parts), "utf8");

function fenced(markdown, language) {
    return [...markdown.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))]
        .map(match => match[1]);
}

function typeCheckTypeScriptSnippets(snippets, name) {
    const ts = require("typescript");
    const directory = tempDir(`scramjet-${name}-ts-`);
    const sourcePaths = snippets.map((snippet, index) => {
        const sourcePath = path.join(directory, `${name}-${index}.ts`);
        const prelude = `${snippet.includes('from "node:stream"') || snippet.includes('from "stream"') ? "" : "type Readable = any;\n"}declare const Transform: any;\ndeclare const transform: any;\ndeclare const through2: any;\n${snippet.includes("const fixture") ? "" : "declare const fixture: any;\n"}`;
        fs.writeFileSync(sourcePath, `${prelude}${snippet}`);
        return sourcePath;
    });
    const shimPath = path.join(directory, "documentation-modules.d.ts");
    fs.writeFileSync(shimPath, `
declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  export class McpServer {
    constructor(options: { name: string; version: string });
    registerTool(name: string, config: { description: string; inputSchema: unknown }, handler: (input: any) => Promise<any>): void;
    connect(transport: unknown): Promise<void>;
  }
}
declare module "@modelcontextprotocol/sdk/server/stdio.js" { export class StdioServerTransport {} }
declare module "through2" { const through2: any; export default through2; }
`);

    try {
        const options = {
            strict: true,
            target: ts.ScriptTarget.ES2019,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            esModuleInterop: true,
            skipLibCheck: true,
            noUnusedLocals: false,
            baseUrl: repoRoot,
            paths: { "@scramjet/*": ["packages/*/src/index.ts"], zod: ["node_modules/zod/index.d.ts"] },
        };
        const program = ts.createProgram([...sourcePaths, shimPath], options);
        return ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

function tempDir(prefix = "scramjet-docs-test-") {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function generatedOutput(dir) {
    return {
        path: dir,
        value: path.relative(repoRoot, dir).split(path.sep).join("/"),
        source: "test",
        allowUnmarkedExisting: true,
        writeRepoReadmes: false,
    };
}

function outputSnapshot(dir) {
    const files = [];
    function visit(current) {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const file = path.join(current, entry.name);
            if (entry.isDirectory()) visit(file);
            else files.push([path.relative(dir, file), fs.readFileSync(file, "utf8")]);
        }
    }
    visit(dir);
    return files;
}

test.afterEach.always(t => {
    if (t.context?.dir) fs.rmSync(t.context.dir, { recursive: true, force: true });
});

test("the planned default documentation output root is docs", t => {
    const previous = process.env.SCRAMJET_DOCS_OUTPUT_DIR;
    delete process.env.SCRAMJET_DOCS_OUTPUT_DIR;

    try {
        t.is(docs.outputRoot().value, "docs");
        t.is(docs.outputRoot().source, "package");
    } finally {
        if (previous === undefined) delete process.env.SCRAMJET_DOCS_OUTPUT_DIR;
        else process.env.SCRAMJET_DOCS_OUTPUT_DIR = previous;
    }
});

test("SCRAMJET_DOCS_OUTPUT_DIR overrides package configuration and fallback", t => {
    const dir = tempDir();
    t.context = { dir };
    const previous = process.env.SCRAMJET_DOCS_OUTPUT_DIR;
    process.env.SCRAMJET_DOCS_OUTPUT_DIR = dir;

    try {
        t.is(docs.outputRoot().path, path.resolve(dir));
        t.is(docs.outputRoot().source, "env");
    } finally {
        if (previous === undefined) delete process.env.SCRAMJET_DOCS_OUTPUT_DIR;
        else process.env.SCRAMJET_DOCS_OUTPUT_DIR = previous;
    }
});

test("the package docs output configuration is the planned docs root", t => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    t.is(packageJson.scramjet?.docs?.outputDir, "docs");
});

test("protected roots and descendants are rejected before any write", t => {
    for (const relative of ["", "docs-source", "conductor", "packages", "scripts", "src"]) {
        t.throws(() => docs.validateOutputRoot(path.join(repoRoot, relative)), { message: /protected docs output root/ });
    }
    t.notThrows(() => docs.validateOutputRoot(path.join(repoRoot, "docs"), { allowUnmarkedExisting: true }));
});

test("cleanup requires the generator marker and never removes a sibling", t => {
    const dir = tempDir();
    t.context = { dir };
    const output = path.join(dir, "output");
    const sibling = path.join(dir, "manual");
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "manual.txt"), "keep\n");
    fs.mkdirSync(sibling);
    fs.writeFileSync(path.join(sibling, "sentinel.txt"), "keep\n");

    t.throws(() => docs.cleanOutput(output), { message: /unmarked docs output root/ });
    fs.writeFileSync(docs.markerPath(output), `${JSON.stringify({ generatedBy: "scripts/docs.js" })}\n`);
    docs.cleanOutput(output);

    t.false(fs.existsSync(output));
    t.true(fs.existsSync(path.join(sibling, "sentinel.txt")));
});

test("output cleanup and replacement require the exact generator marker contract", t => {
    const dir = tempDir();
    t.context = { dir };
    const output = path.join(dir, "output");
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "sentinel.txt"), "preserve\n");

    for (const marker of ["{}\n", "{\"generatedBy\":\"foreign-tool\"}\n", "not json\n"]) {
        fs.writeFileSync(docs.markerPath(output), marker);
        t.throws(() => docs.cleanOutput(output), { message: /(?:invalid|foreign) docs output marker/ });
        t.throws(() => docs.generate(generatedOutput(output)), { message: /(?:invalid|foreign) docs output marker/ });
        t.true(fs.existsSync(path.join(output, "sentinel.txt")));
    }
});

test("unmarked docs content is rejected without deletion", t => {
    const output = path.join(repoRoot, "docs");
    const marker = docs.markerPath(output);
    const sentinel = path.join(output, "unowned-sentinel.txt");
    const markerContent = fs.readFileSync(marker, "utf8");
    fs.writeFileSync(sentinel, "preserve\n");
    fs.rmSync(marker);

    try {
        t.throws(() => docs.generate({ ...generatedOutput(output), value: "docs" }), { message: /unmarked docs output root/ });
        t.is(fs.readFileSync(sentinel, "utf8"), "preserve\n");
    } finally {
        fs.writeFileSync(marker, markerContent);
        fs.rmSync(sentinel, { force: true });
    }
});

test("preserved technical-debt content is routed and its Conductor links are rebased", t => {
    const source = path.join(repoRoot, "docs-source", "development", "technical-debt.md");
    const generated = path.join(repoRoot, "docs", "content", "development", "technical-debt.md");
    t.true(fs.existsSync(source));
    t.true(fs.existsSync(generated));
    t.regex(fs.readFileSync(source, "utf8"), /^---\nid: development-technical-debt\nslug: \/development\/technical-debt/m);
    t.regex(fs.readFileSync(source, "utf8"), /\.\.\/\.\.\/conductor\/archive/);
    t.regex(fs.readFileSync(generated, "utf8"), /\.\.\/\.\.\/\.\.\/conductor\/archive/);
});

test("runner-python README links are rebased to generated content", t => {
    const source = fs.readFileSync(path.join(repoRoot, "docs-source", "readmes", "packages", "runner-python.md"), "utf8");
    const generated = fs.readFileSync(path.join(repoRoot, "docs", "readmes", "packages", "runner-python", "README.md"), "utf8");
    t.regex(source, /\.\.\/docs\/content\/sequences\//);
    t.regex(generated, /\.\.\/\.\.\/\.\.\/content\/sequences\//);
    t.notRegex(generated, /\]\(\.\.\/\.\.\/sequences\//);
});

test("guide-pair sources contain installed API and routing evidence", t => {
    const read = relative => fs.readFileSync(path.join(repoRoot, "docs-source", relative), "utf8");
    const setup = read("sequences/setup-and-run.md");
    const api = read("api/client-usage.md");
    const communication = read("sequences/sequence-communication.md");
    const topics = read("sequences/sequence-topics.md");
    const packaging = read("sequences/packaging-deploying.md");

    t.regex(setup, /npm install -g @scramjet\/sth @scramjet\/cli/);
    t.regex(setup, /si sequence deploy/);
    t.regex(setup, /sequence-communication\.md/);
    t.regex(api, /createRootClient/);
    t.regex(api, /sendSequence/);
    t.regex(api, /\/rpc\/status/);
    t.regex(api, /space\.hub\(remote\.hubId\)\.instance\(remote\.id\)/);
    t.regex(communication, /RpcRequest/);
    t.regex(communication, /RpcResponse/);
    t.regex(communication, /spaces\/space-1\/hubs\/hub-2/);
    t.regex(topics, /--input-topic sensor-readings/);
    t.regex(topics, /--output-topic normalized-readings/);
    t.regex(topics, /hubClient\(\)\.topicWrite\.post/);
    t.regex(packaging, /setup-and-run\.md/);
    t.notRegex(topics, /this\.(?:consumes|produces)\s*\(/);
});

test("control guides document direct and Manager-routed terminal outcomes", t => {
    const control = readSourceDoc("sequences", "sequence-control.md");
    const wet = readSourceDoc("examples", "customer-site-health-control.md");
    t.regex(control, /direct:\s+caller -> Hub -> instance -> terminal state/);
    t.regex(control, /routed:\s+caller -> Manager -> connected Hub -> instance -> terminal state/);
    t.regex(control, /health[\s\S]*stop[\s\S]*kill[\s\S]*timeout[\s\S]*errored/);
    t.regex(control, /`stopping`[\s\S]*`killing`[\s\S]*`completed`[\s\S]*`errored`[\s\S]*`gone`/);
    t.regex(wet, /bounded timeout[\s\S]*kill/);
    const conformance = fs.readFileSync(path.join(repoRoot, "packages/manager/test/manager-api-v2-hotwire.spec.ts"), "utf8");
    t.regex(conformance, /real Manager-routed CSI control preserves direct Hub semantics/);
    t.regex(conformance, /InstanceStatus\.COMPLETED/);
    t.regex(conformance, /RunnerMessageCode\.(STOP|KILL)/);
});

test("API and MCP guides keep sequence exposure scoped and standalone", t => {
    t.notRegex(readSourceDoc("sequences", "sequence-api-exposure.md"), /MCP/);
    const mcp = readSourceDoc("examples", "mcp-bridged-job-status.md");
    t.regex(mcp, /McpServer/);
    t.regex(mcp, /z\.string\(\)\.regex/);
    t.regex(mcp, /source of truth/);
    t.notRegex(mcp, /cursor|CURSOR_FILE|cursorFile/i);
});

test("communication and topic guides preserve live-event and route-boundary claims", t => {
    t.regex(readSourceDoc("manager", "overview.md"), /not persisted and cannot be replayed/);
    const topics = readSourceDoc("sequences", "sequence-topics.md");
    t.regex(topics, /v1 compatibility/);
    t.regex(topics, /api\/v2\/topics/);
    t.regex(topics, /body: Readable\.from/);
});

test("AppContext guides name the canonical type and intentional runtime limits", t => {
    const writing = readSourceDoc("sequences", "writing-sequences.md");
    const parity = readSourceDoc("reference", "runtime-app-context-conformance.md");
    t.regex(writing, /@scramjet\/sequence-types/);
    t.regex(writing, /hubClient\(\)/);
    t.regex(writing, /spaceClient\(\)/);
    t.regex(parity, /Hosted Bun delegates to Node|Node delegation/);
    t.regex(parity, /Unsupported/);
    t.regex(parity, /generic Python REST SDK/);
});

test("all contract guides have extractable, type-checkable TypeScript and valid Python/Compose snippets", t => {
    const wetPages = [
        "lifecycle-local-validation-service.md", "customer-site-health-control.md", "mcp-bridged-job-status.md",
        "local-object-filter-to-consumer.md", "customer-site-topic-probe-pipeline.md", "tested-incremental-log-aggregator.md",
        "app-context-health-parity.md", "source-side-data-summary.md",
    ];
    const markdown = [
        ...wetPages.map(page => readSourceDoc("examples", page)),
        readSourceDoc("sequences", "sequence-lifecycle.md"), readSourceDoc("sequences", "sequence-control.md"),
        readSourceDoc("sequences", "sequence-api-exposure.md"), readSourceDoc("sequences", "sequence-communication.md"),
        readSourceDoc("sequences", "sequence-topics.md"), readSourceDoc("sequences", "sequence-app-context.md"),
        readSourceDoc("sequences", "writing-sequences.md"), readSourceDoc("transform-hub", "configuration.md"),
    ];
    for (const page of wetPages) t.regex(readSourceDoc("examples", page), /\]\(\.\.\/[^)]*\.md(?:#[^)]*)?\)/, `${page} links to its dry guide`);
    const typescript = markdown.flatMap(page => fenced(page, "typescript"));
    t.true(typescript.length > 0);
    t.deepEqual(typeCheckTypeScriptSnippets(typescript, "contract"), []);
    for (const snippet of markdown.flatMap(page => fenced(page, "python"))) {
        const result = spawnSync("python3", ["-c", "import ast, sys; ast.parse(sys.stdin.read())"], { input: snippet, encoding: "utf8" });
        t.is(result.status, 0, result.stderr);
    }
    const mcp = fenced(readSourceDoc("examples", "mcp-bridged-job-status.md"), "typescript").filter(snippet => snippet.includes("McpServer"));
    t.is(mcp.length, 1);
    t.deepEqual(typeCheckTypeScriptSnippets(mcp, "mcp-bridge"), []);
    t.regex(mcp[0], /@modelcontextprotocol\/sdk\/server\/mcp\.js/);
    t.regex(mcp[0], /@modelcontextprotocol\/sdk\/server\/stdio\.js/);
    t.regex(mcp[0], /from "zod"/);
    const yaml = require("yaml");
    const compose = fenced(readSourceDoc("transform-hub", "configuration.md"), "yaml").find(snippet => snippet.includes("services:"));
    t.truthy(compose);
    t.truthy(yaml.parse(compose));
    t.regex(compose, /healthcheck:/);
    t.regex(compose, /127\.0\.0\.1:8000:8000/);
    t.regex(compose, /internal: true/);
});

test("runtime evidence matches lifecycle and monitoring documentation", t => {
    const nodeRunner = fs.readFileSync(path.join(repoRoot, "packages/runner-node/src/bin/runner-node.ts"), "utf8");
    const pythonRunner = fs.readFileSync(path.join(repoRoot, "packages/runner-python/src/runner_python/__main__.py"), "utf8");
    t.regex(nodeRunner, /INITIALIZE_REJECTED[\s\S]*throw error/);
    t.regex(nodeRunner, /\{ \.\.\.health, \.\.\.getMemoryUsage\(\) \}/);
    t.regex(nodeRunner, /\{ healthy: true, \.\.\.getMemoryUsage\(\) \}/);
    t.regex(pythonRunner, /INITIALIZE_REJECTED[\s\S]*return 1/);
    const monitoring = readSourceDoc("sequences", "sequence-monitoring.md");
    t.regex(monitoring, /"memoryUsage": 12345678/);
    t.regex(monitoring, /"memoryMaxUsage": 23456789/);
    t.regex(monitoring, /runtime telemetry[\s\S]*not placed inside/);
    t.regex(readSourceDoc("reference", "runtime-app-context-conformance.md"), /runner telemetry at top level/);
});

test("lifecycle, control, API, communication, topics, and AppContext guides link claims to evidence", t => {
    const guides = {
        lifecycle: readSourceDoc("sequences", "sequence-lifecycle.md"),
        control: readSourceDoc("sequences", "sequence-control.md"),
        api: readSourceDoc("sequences", "sequence-api-exposure.md"),
        communication: readSourceDoc("sequences", "sequence-communication.md"),
        topics: readSourceDoc("sequences", "sequence-topics.md"),
        appContext: readSourceDoc("sequences", "sequence-app-context.md"),
    };
    t.regex(guides.lifecycle, /## Lifecycle states[\s\S]*## Validate before serving/);
    t.regex(guides.lifecycle, /Validate before serving/);
    t.regex(guides.control, /Health is an observation/);
    t.regex(guides.api, /sequence API owns its route/);
    t.regex(guides.communication, /narrowest path/);
    t.regex(guides.topics, /Topics are named live data channels/);
    t.regex(guides.appContext, /@scramjet\/sequence-types/);
    const testing = readSourceDoc("testing", "testing-sequences.md");
    t.regex(testing, /@scramjet\/sequence-test/);
    for (const guide of Object.values(guides)) t.regex(guide, /validation|monitoring|events|topic|parity|runtime wrapper/i);
});

test("source-summary and configuration guides describe the canonical safe models", t => {
    const source = readSourceDoc("examples", "source-side-data-summary.md");
    for (const expression of [
        /async function validateDirectory\(value: unknown\): Promise<string>/,
        /if \(typeof value !== "string" \|\| !path\.isAbsolute\(value\)\)/,
        /if \(!info\.isDirectory\(\)\) throw new Error\("sourceDirectory must be a directory"\);/,
        /import \{ opendir, stat \} from "node:fs\/promises"/,
        /for await \(const entry of directory\)/,
        /Number\.isSafeInteger\(info\.size\)/,
        /throw new Error\("directory entry escaped sourceDirectory"\);/,
        /validates an absolute directory and opens it before registering.*health/,
        /si config set apiUrl/,
        /si sequence deploy/,
        /si instance output/,
        /stream compact metadata summaries without uploading/,
    ]) t.regex(source, expression);
    const config = readSourceDoc("sequences", "sequence-configuration-resources-state.md");
    t.regex(config, /where the source is accessible/i);
    t.regex(config, /validate and open the source once/i);
    t.regex(config, /stream summaries incrementally/i);
    t.regex(config, /There is no separate producer/);
    t.regex(config, /model containing precomputed results/);
    t.notRegex(config, /send the summary as normal Sequence input/);
    t.notRegex(config, /precompute.*input/);
    t.regex(config, /## What the adapter can see/);
    t.regex(config, /## State is application-owned/);
});

test("every example page documents the complete installed-adapter workflow", t => {
    const pages = ["simple-transform.md", "lifecycle-local-validation-service.md", "customer-site-health-control.md", "mcp-bridged-job-status.md", "local-object-filter-to-consumer.md", "customer-site-topic-probe-pipeline.md", "tested-incremental-log-aggregator.md", "app-context-health-parity.md", "source-side-data-summary.md", "python-log-processor.md"];
    for (const page of pages) {
        const markdown = readSourceDoc("examples", page);
        t.regex(markdown, /\]\(\.\.\/sequences\/setup-and-run\.md\)/, `${page} has setup-and-run`);
        t.regex(markdown, /sth --runtime-adapter process/, `${page} starts the process adapter`);
        t.regex(markdown, /curl.*127\.0\.0\.1:8000\/api\/v1\/status/, `${page} checks readiness`);
        t.regex(markdown, /si sequence pack/, `${page} packs a sequence`);
        t.regex(markdown, /si sequence deploy|si sequence send/, `${page} deploys or sends`);
        t.regex(markdown, /(?:observable\s+)?(?:Live\s+)?[Ss]uccess(?:ful)?(?:\s+\S+){0,5}\s+(?:is|shows|result)/, `${page} checks success`);
        for (const block of [...fenced(markdown, "bash"), ...fenced(markdown, "shell")]) {
            t.notRegex(block, /cd packages\/sequence-test|npm run docs:check|\b(?:npx\s+)?ava\b|npm run test:(?:packages|bdd|sequence-appcontext)/, `${page} terminal block is author-facing`);
        }
        t.notRegex(markdown, /deployment\s+is\s+(?:deferred|outside|not\s+covered|beyond)/i, `${page} does not defer deployment`);
    }
});

test("generated-output link validation rejects missing relative targets", t => {
    const dir = tempDir();
    t.context = { dir };
    fs.writeFileSync(path.join(dir, "broken.md"), "[broken](missing.md)\n");
    t.throws(() => docs.validateGeneratedLinks(dir), { message: /missing generated target/ });
});

test("generation is deterministic", t => {
    const dir = tempDir();
    t.context = { dir };
    const output = path.join(dir, "output");
    docs.generate(generatedOutput(output));
    const first = outputSnapshot(output);
    docs.generate(generatedOutput(output));
    t.deepEqual(outputSnapshot(output), first);
});

test("every generated docs directory has a deterministic navigable README index", t => {
    const directories = [];
    const visit = dir => {
        directories.push(dir);
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) visit(path.join(dir, entry.name));
        }
    };
    visit(path.join(repoRoot, "docs"));

    for (const dir of directories) {
        const index = fs.existsSync(path.join(dir, "README.index.md")) ? path.join(dir, "README.index.md") : path.join(dir, "README.md");
        t.true(fs.existsSync(index), `missing index for ${path.relative(repoRoot, dir)}`);
        const content = fs.readFileSync(index, "utf8");
        t.true(content.includes("Generated by scripts/docs.js: directory index"), `unowned index for ${path.relative(repoRoot, dir)}`);
        const navigation = /<!-- docs-directory-index:start -->[\s\S]*?<!-- docs-directory-index:end -->/.exec(content)?.[0] || content;
        for (const match of navigation.matchAll(/\]\(([^)#]+)\)/g)) {
            t.true(fs.existsSync(path.resolve(path.dirname(index), match[1])), `broken index link ${match[1]} in ${index}`);
        }
    }
});

test("directory README collisions preserve manual content and create a companion index", t => {
    const dir = tempDir();
    t.context = { dir };
    const manualDir = path.join(dir, "manual");
    const emptyDir = path.join(dir, "empty");
    fs.mkdirSync(manualDir, { recursive: true });
    fs.mkdirSync(emptyDir);
    fs.writeFileSync(path.join(manualDir, "README.md"), "manual authority\n");

    docs.generateDirectoryIndexes({ path: dir });

    t.is(fs.readFileSync(path.join(manualDir, "README.md"), "utf8"), "manual authority\n");
    t.true(fs.readFileSync(path.join(manualDir, "README.index.md"), "utf8").includes("preserved hand-authored"));
    t.true(fs.readFileSync(path.join(emptyDir, "README.md"), "utf8").includes("This directory is empty"));
    t.regex(fs.readFileSync(path.join(dir, "README.md"), "utf8"), /manual\/README\.index\.md/);
});

test("ordinary generation does not overwrite a manual package README", t => {
    const dir = tempDir();
    t.context = { dir };
    const repoReadmes = path.join(dir, "repo");
    const readme = path.join(repoReadmes, "packages", "types", "README.md");
    fs.mkdirSync(path.dirname(readme), { recursive: true });
    fs.writeFileSync(readme, "manual README\n");

    docs.generate(generatedOutput(path.join(dir, "output")));
    t.is(fs.readFileSync(readme, "utf8"), "manual README\n");
});

test("ordinary docs check ignores directly maintained root and package README content", t => {
    const rootReadme = path.join(repoRoot, "README.md");
    const packageReadme = path.join(repoRoot, "packages", "types", "README.md");
    const originals = new Map([
        [rootReadme, fs.readFileSync(rootReadme, "utf8")],
        [packageReadme, fs.readFileSync(packageReadme, "utf8")],
    ]);

    try {
        fs.writeFileSync(rootReadme, "directly maintained root README\n");
        fs.writeFileSync(packageReadme, "directly maintained package README\n");
        const result = spawnSync(process.execPath, [docsScript, "check"], { cwd: repoRoot, encoding: "utf8" });
        t.is(result.status, 0, result.stderr);
        t.is(fs.readFileSync(rootReadme, "utf8"), "directly maintained root README\n");
        t.is(fs.readFileSync(packageReadme, "utf8"), "directly maintained package README\n");
    } finally {
        for (const [file, content] of originals) fs.writeFileSync(file, content);
    }
});

test("the legacy dist-docs root is absent or an explicit redirect", t => {
    const legacy = path.join(repoRoot, "dist-docs");
    if (!fs.existsSync(legacy)) {
        t.false(fs.existsSync(legacy));
        return;
    }
    const entries = fs.readdirSync(legacy);
    t.true(entries.length === 1 && entries[0].toLowerCase().includes("redirect"));
});

test("legacy dist-docs cleanup refuses an unmarked root", t => {
    const legacy = path.join(repoRoot, "dist-docs");
    const docsOutput = path.join(repoRoot, "docs");
    const beforeDocs = outputSnapshot(docsOutput);
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, "sentinel.txt"), "preserve\n");

    try {
        t.throws(() => docs.generate({ ...generatedOutput(path.join(repoRoot, "docs")), value: "docs" }), { message: /unmarked docs output root/ });
        t.true(fs.existsSync(path.join(legacy, "sentinel.txt")));
        t.deepEqual(outputSnapshot(docsOutput), beforeDocs);
    } finally {
        fs.rmSync(legacy, { recursive: true, force: true });
    }
});

test("validateTableColumns passes a well-formed 3-column table", t => {
    t.notThrows(() => docs.validateTableColumns("test.md", [
        "| A | B | C |",
        "|---|---|---|",
        "| 1 | 2 | 3 |",
    ].join("\n")));
});

test("validateTableColumns passes a well-formed 4-column table", t => {
    t.notThrows(() => docs.validateTableColumns("test.md", [
        "| Capability | Node | Python | Bun |",
        "|---|---|---|---|",
        "| Health | yes | yes | no |",
    ].join("\n")));
});

test("validateTableColumns rejects header/separator column mismatch (4 header vs 5 separator)", t => {
    const err = t.throws(() => docs.validateTableColumns("test.md", [
        "| Capability | Node | Python | Bun |",
        "|---|---|---|---|---|",
        "| Health | yes | yes | no |",
    ].join("\n")));
    t.regex(err.message, /line 1: table header has 4 columns but separator \(line 2\) has 5 columns/);
});

test("validateTableColumns rejects header/separator column mismatch (3 header vs 4 separator)", t => {
    const err = t.throws(() => docs.validateTableColumns("test.md", [
        "| A | B | C |",
        "|---|---|---|---|",
        "| 1 | 2 | 3 |",
    ].join("\n")));
    t.regex(err.message, /line 1: table header has 3 columns but separator \(line 2\) has 4 columns/);
});

test("validateTableColumns rejects header/separator column mismatch with spaces inside pipes", t => {
    const err = t.throws(() => docs.validateTableColumns("test.md", [
        "| Capability | Node | Hosted Python | Hosted Bun |",
        "| --- | --- | --- | --- | --- |",
        "| Health | yes | yes | no |",
    ].join("\n")));
    t.regex(err.message, /line 1: table header has 4 columns but separator \(line 2\) has 5 columns/);
});

test("validateTableColumns passes a file with no tables", t => {
    t.notThrows(() => docs.validateTableColumns("test.md", [
        "# Heading",
        "",
        "Some text without any table.",
    ].join("\n")));
});

test("validateTableColumns passes a file with a table inside a code block", t => {
    t.notThrows(() => docs.validateTableColumns("test.md", [
        "```",
        "| fake | table | header |",
        "|------|-------|-------|",
        "| a    | b     | c     |",
        "```",
    ].join("\n")));
});

test("validateTableColumns passes a 3-column table inside a code block and a real 4-column table outside", t => {
    t.notThrows(() => docs.validateTableColumns("test.md", [
        "```",
        "| fake | table | header | extra |",
        "|------|-------|-------|------|",
        "```",
        "",
        "| Real | Table | Here |",
        "|------|-------|------|",
        "| a    | b     | c    |",
    ].join("\n")));
});

test("package README synchronization is explicit", t => {
    const dir = tempDir("scramjet-docs-sync-");
    const packageReadmes = [...fs.readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true })]
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(repoRoot, "packages", entry.name, "README.md"))
        .filter(file => fs.existsSync(file));
    const originals = new Map(packageReadmes.map(file => [file, fs.readFileSync(file, "utf8")]));
    try {
        const result = spawnSync(process.execPath, [docsScript, "sync:readmes"], {
            cwd: repoRoot,
            encoding: "utf8",
            env: { ...process.env, SCRAMJET_DOCS_OUTPUT_DIR: dir },
        });
        t.is(result.status, 0, result.stderr);
    } finally {
        for (const [file, content] of originals) fs.writeFileSync(file, content);
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("README synchronization preserves ownership and refuses unowned files", t => {
    const packageReadmes = [...fs.readdirSync(path.join(repoRoot, "packages"), { withFileTypes: true })]
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(repoRoot, "packages", entry.name, "README.md"))
        .filter(file => fs.existsSync(file));
    const originals = new Map(packageReadmes.map(file => [file, fs.readFileSync(file, "utf8")]));
    const runSync = () => spawnSync(process.execPath, [docsScript, "sync:readmes"], { cwd: repoRoot, encoding: "utf8" });

    try {
        t.is(runSync().status, 0);
        t.true(originals.size > 0);
        t.true([...originals.keys()].every(file => fs.readFileSync(file, "utf8").includes("Generated by scripts/docs.js")));

        const manual = path.join(repoRoot, "packages", "types", "README.md");
        fs.writeFileSync(manual, "manual README\n");
        const refused = runSync();
        t.not(refused.status, 0);
        t.is(fs.readFileSync(manual, "utf8"), "manual README\n");
    } finally {
        for (const [file, content] of originals) fs.writeFileSync(file, content);
    }
});
