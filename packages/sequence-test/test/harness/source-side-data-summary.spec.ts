import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import testBase from "ava";
import ts from "typescript";

const {
    allowAvaMemoryGrowth,
    createAvaMemoryGuard,
    registerAvaMemoryCleanup
} = require("../../../../scripts/lib/ava-memory-guard");
const test: typeof testBase = createAvaMemoryGuard(testBase);

const walkthroughPath = path.resolve(__dirname, "../../../../docs-source/examples/source-side-data-summary.md");

test("source-side data summary TypeScript walkthrough blocks compile", async t => {
    allowAvaMemoryGrowth(t, {
        threshold: 768 * 1024,
        reason: "TypeScript compiler program metadata is released by the registered cleanup but exceeds the default guard by a small amount."
    });

    const markdown = await fs.readFile(walkthroughPath, "utf8");
    const snippets = [...markdown.matchAll(/```typescript\n([\s\S]*?)```/g)].map(match => match[1]);

    t.is(snippets.length, 3, "the walkthrough has source, sequence, and cursor TypeScript blocks");
    t.regex(
        snippets[1],
        /import type \{ ReadableStream, SequenceApplication, SequenceAppContext \} from "@scramjet\/sequence-types";/
    );
    t.regex(snippets[1], /const application: SequenceApplication<SourceSummary, SummaryTotals>/);
    t.regex(snippets[1], /return output\(\);/);

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sequence-test-doc-snippets-"));
    let currentProgram: ts.Program | undefined;
    let diagnostics: readonly ts.Diagnostic[] = [];
    registerAvaMemoryCleanup(t, async () => {
        snippets.length = 0;
        diagnostics = [];
        currentProgram = undefined;
        await fs.rm(directory, { recursive: true, force: true });
    });

    await fs.writeFile(path.join(directory, "source.ts"), snippets[0], "utf8");
    await fs.writeFile(path.join(directory, "sequence.ts"), snippets[1], "utf8");
    await fs.writeFile(
        path.join(directory, "cursor.ts"),
        `declare const fixture: { directory: string };\n${snippets[2]}`,
        "utf8"
    );

    currentProgram = ts.createProgram(
        ["source.ts", "sequence.ts", "cursor.ts"].map(file => path.join(directory, file)),
        {
            noEmit: true,
            skipLibCheck: true,
            strict: true,
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            types: ["node"],
            allowSyntheticDefaultImports: true,
            baseUrl: path.resolve(__dirname, "../.."),
            paths: {
                "@scramjet/sequence-test": ["src/index.ts"],
                "@scramjet/sequence-types": ["../sequence-types/src/index.ts"]
            }
        }
    );
    diagnostics = ts.getPreEmitDiagnostics(currentProgram!);

    t.deepEqual(
        diagnostics,
        [],
        diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n")
    );
});
