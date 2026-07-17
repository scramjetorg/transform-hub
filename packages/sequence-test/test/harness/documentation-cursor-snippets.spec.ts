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

const documentationPaths = [
    path.resolve(__dirname, "../../../../docs-source/testing/testing-sequences.md"),
    path.resolve(__dirname, "../../../../docs-source/examples/tested-incremental-log-aggregator.md")
];

test("new file-backed cursor documentation snippets type-check", async t => {
    // The TypeScript program is explicitly released below; its compiler metadata needs
    // a small allowance above the default memory-guard threshold.
    allowAvaMemoryGrowth(t, {
        threshold: 768 * 1024,
        reason: "TypeScript compiler metadata for the two extracted documentation snippets is released by the registered cleanup."
    });

    const snippets = await Promise.all(documentationPaths.map(async documentationPath => {
        const markdown = await fs.readFile(documentationPath, "utf8");
        const matches = [...markdown.matchAll(/```typescript\n([\s\S]*?)```/g)]
            .map(match => match[1])
            .filter(snippet => snippet.includes('import { createFileBackedMockCursor } from "@scramjet/sequence-test";'));

        t.is(matches.length, 1, `${path.basename(documentationPath)} has one cursor snippet`);
        return matches[0];
    }));

    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sequence-test-doc-cursor-"));
    let program: ts.Program | undefined;
    let diagnostics: readonly ts.Diagnostic[] = [];
    registerAvaMemoryCleanup(t, async () => {
        snippets.length = 0;
        diagnostics = [];
        program = undefined;
        await fs.rm(directory, { recursive: true, force: true });
    });

    const files = await Promise.all(snippets.map(async (snippet, index) => {
        const filePath = path.join(directory, `cursor-${index}.ts`);
        await fs.writeFile(filePath, `declare const fixture: { directory: string };\n${snippet}`, "utf8");
        return filePath;
    }));

    program = ts.createProgram(files, {
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
            "@scramjet/sequence-test": ["src/index.ts"]
        }
    });
    diagnostics = ts.getPreEmitDiagnostics(program);

    t.deepEqual(
        diagnostics,
        [],
        diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n")
    );
});
