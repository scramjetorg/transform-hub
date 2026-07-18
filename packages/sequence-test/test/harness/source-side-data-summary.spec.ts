import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import testBase from "ava";
import ts from "typescript";

import {
    createHubHarness,
    createSequenceFixture,
    createSequenceTest,
    resolveSequenceFixtureMetadata
} from "../../src";

const {
    allowAvaMemoryGrowth,
    createAvaMemoryGuard,
    registerAvaMemoryCleanup
} = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof testBase = createAvaMemoryGuard(testBase);

const walkthroughPath = path.resolve(__dirname, "../../../../docs-source/examples/source-side-data-summary.md");

test("source-side data walkthrough compiles and runs its loaded sequence", async t => {
    allowAvaMemoryGrowth(t, {
        threshold: 768 * 1024,
        reason: "TypeScript compiler metadata and the temporary fixture are released by cleanup."
    });

    const markdown = await fs.readFile(walkthroughPath, "utf8");
    const snippets = [...markdown.matchAll(/```typescript\n([\s\S]*?)```/g)].map(match => match[1]);

    t.is(snippets.length, 2, "the walkthrough has sequence and validation TypeScript blocks");
    t.regex(snippets[0], /opendir\(root\)/);
    t.true(snippets[0].indexOf("const directory = await opendir(root);") < snippets[0].indexOf('this.api.use("/health"'));
    t.regex(snippets[0], /for await \(const entry of directory\)/);
    t.regex(snippets[0], /yield \{ file: relative, bytes: info\.size/);
    t.regex(snippets[0], /this\.api\.use\("\/health"/);
    t.notRegex(markdown, /## Cursor|cursor helper|summary-input model|separate producer script/);

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sequence-test-doc-snippets-"));
    let fixture: Awaited<ReturnType<typeof createSequenceFixture>> | undefined;
    let diagnostics: readonly ts.Diagnostic[] = [];
    registerAvaMemoryCleanup(t, async () => {
        snippets.length = 0;
        diagnostics = [];
        await fixture?.cleanup();
        await fs.rm(directory, { recursive: true, force: true });
    });

    const validation = [
        "declare const sequenceDirectory: string;",
        "declare const sourceDirectory: string;",
        snippets[1]
    ].join("\n");
    await fs.writeFile(path.join(directory, "sequence.ts"), snippets[0], "utf8");
    await fs.writeFile(path.join(directory, "validation.ts"), validation, "utf8");

    diagnostics = [
        ts.transpileModule(snippets[0], {
            reportDiagnostics: true,
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
        }),
        ts.transpileModule(validation, {
            reportDiagnostics: true,
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
        })
    ].flatMap(result => result.diagnostics ?? []);
    t.deepEqual(
        diagnostics,
        [],
        diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n")
    );

    const sourceDirectory = path.join(directory, "source");
    await fs.mkdir(sourceDirectory);
    await fs.writeFile(path.join(sourceDirectory, "first.txt"), "one", "utf8");
    await fs.writeFile(path.join(sourceDirectory, "second.txt"), "two", "utf8");

    const compiled = ts.transpileModule(snippets[0], {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    fixture = await createSequenceFixture({
        "package.json": JSON.stringify({ main: "index.js" }),
        "index.js": compiled
    });
    const metadata = await resolveSequenceFixtureMetadata(fixture.directory);
    const harness = createHubHarness();
    const context = { ...harness.context, config: { sourceDirectory } };
    const loaded = require(metadata.mainPath) as { default: (input: unknown) => Promise<AsyncIterable<unknown>> };
    const output = await loaded.default.call(context, undefined);
    const summaries: Array<{ file: string; bytes: number; modifiedAt: string }> = [];
    for await (const summary of output) summaries.push(summary as typeof summaries[number]);

    t.deepEqual(summaries.map(summary => summary.file).sort(), ["first.txt", "second.txt"]);
    t.deepEqual(summaries.map(summary => summary.bytes).sort(), [3, 3]);
    t.deepEqual(harness.apiRoutes().map(route => route.path), ["/health"]);
    let healthBody = "";
    (harness.apiRoutes()[0].handler as (req: unknown, res: { end(body: string): void }) => void)({}, {
        end: body => { healthBody = body; }
    });
    t.deepEqual(JSON.parse(healthBody), { status: "ok" });

    const failedHarness = createHubHarness();
    const setupError = await t.throwsAsync(
        () => loaded.default.call({ ...failedHarness.context, config: { sourceDirectory: path.join(directory, "missing") } }, undefined)
    );
    t.regex(setupError.message, /ENOENT|no such file/i);
    t.deepEqual(failedHarness.apiRoutes(), []);

    // Non-directory config: sourceDirectory points to an existing file, not a directory.
    const filePathHarness = createHubHarness();
    const fileConfigError = await t.throwsAsync(
        () => loaded.default.call({
            ...filePathHarness.context,
            config: { sourceDirectory: metadata.mainPath }
        }, undefined)
    );
    t.regex(fileConfigError.message, /must be a directory/i);
    t.deepEqual(filePathHarness.apiRoutes(), []);

    const readiness = await createSequenceTest({ runtime: "node", sequencePath: metadata.mainPath });
    await readiness.validate();
    await readiness.initialize();
    await readiness.activateRoute("/health");
    t.is(readiness.state(), "ready");
    t.deepEqual(readiness.activeRoutes(), ["/health"]);
    await readiness.close();
});
