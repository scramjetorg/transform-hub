"use strict";

const test = require("ava");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const docs = require("../docs.js");

const repoRoot = path.resolve(__dirname, "../..");
const docsScript = path.join(repoRoot, "scripts/docs.js");

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
