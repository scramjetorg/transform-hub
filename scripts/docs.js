#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "docs-source");
const routedSections = [
    "intro",
    "transform-hub",
    "manager",
    "sequences",
    "testing",
    "cli",
    "api",
    "deployment",
    "development",
    "examples"
];

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function packageDocsConfig() {
    const pkg = readJson(path.join(root, "package.json"));

    return pkg.scramjet?.docs ?? {};
}

function outputRoot() {
    const envOutput = process.env.SCRAMJET_DOCS_OUTPUT_DIR;
    const configuredOutput = packageDocsConfig().outputDir;
    const selected = envOutput || configuredOutput || "dist-docs";

    return {
        path: path.resolve(root, selected),
        source: envOutput ? "env" : configuredOutput ? "package" : "fallback",
        value: selected
    };
}

function listFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) return listFiles(fullPath);
        if (entry.isFile()) return [fullPath];

        return [];
    });
}

function relativeToRoot(file) {
    return path.relative(root, file).split(path.sep).join("/");
}

function relativeToSource(file) {
    return path.relative(sourceRoot, file).split(path.sep).join("/");
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writeFile(file, content) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, content);
}

function removeDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function markerPath(dir) {
    return path.join(dir, ".scramjet-docs-output.json");
}

function validateOutputRoot(dir, options = {}) {
    const resolved = path.resolve(dir);
    const relative = path.relative(root, resolved);
    const protectedRoots = ["", ".", "docs", "docs-source", "conductor", "packages", "scripts", "src"];
    const isOutsideRoot = relative.startsWith("..");

    if (!isOutsideRoot && protectedRoots.some((protectedRoot) => relative === protectedRoot || relative.startsWith(`${protectedRoot}/`))) {
        throw new Error(`Refusing to use protected docs output root: ${resolved}`);
    }

    if (fs.existsSync(resolved) && !fs.existsSync(markerPath(resolved)) && !options.allowUnmarkedExisting) {
        throw new Error(`Refusing to use existing unmarked docs output root: ${resolved}`);
    }

    if (options.requireMarker && fs.existsSync(resolved) && !fs.existsSync(markerPath(resolved))) {
        throw new Error(`Refusing to clean unmarked docs output root: ${resolved}`);
    }

    if (resolved === sourceRoot || resolved.startsWith(`${sourceRoot}${path.sep}`)) {
        throw new Error("Docs output root must not be inside docs-source/");
    }
}

function writeMarker(dir) {
    writeFile(markerPath(dir), `${JSON.stringify({ generatedBy: "scripts/docs.js" }, null, 2)}\n`);
}

function cleanOutput(dir) {
    validateOutputRoot(dir, { requireMarker: true });

    if (!fs.existsSync(dir)) return;

    removeDir(dir);
}

function fileMap(dir) {
    const map = new Map();

    for (const file of listFiles(dir)) {
        const relative = path.relative(dir, file).split(path.sep).join("/");

        map.set(relative, fs.readFileSync(file, "utf8"));
    }

    return map;
}

function compareDirs(expectedDir, actualDir) {
    const expected = fileMap(expectedDir);
    const actual = fileMap(actualDir);
    const paths = new Set([...expected.keys(), ...actual.keys()]);
    const drift = [];

    for (const file of [...paths].sort()) {
        if (!actual.has(file)) drift.push(`missing ${file}`);
        else if (!expected.has(file)) drift.push(`unexpected ${file}`);
        else if (actual.get(file) !== expected.get(file)) drift.push(`changed ${file}`);
    }

    return drift;
}

function parseFrontmatter(file, content) {
    const match = /^---\n([\s\S]*?)\n---\n/.exec(content);

    if (!match) {
        throw new Error(`${relativeToRoot(file)} is missing YAML frontmatter`);
    }

    const data = {};

    for (const line of match[1].split("\n")) {
        const separator = line.indexOf(":");

        if (separator === -1) continue;

        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");

        data[key] = value;
    }

    for (const key of ["id", "slug", "title"]) {
        if (!data[key]) throw new Error(`${relativeToRoot(file)} frontmatter is missing ${key}`);
    }

    if (!/^[a-z0-9-]+$/.test(data.id)) {
        throw new Error(`${relativeToRoot(file)} frontmatter id must be lowercase dash-separated`);
    }

    return data;
}

function routedMarkdownFiles() {
    return routedSections.flatMap((section) => listFiles(path.join(sourceRoot, section)))
        .filter((file) => file.endsWith(".md"));
}

function validateLinks(file, content) {
    const linkPattern = /\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(content))) {
        const target = match[1].split("#")[0];

        if (!target || target.startsWith("/")) continue;

        const resolved = path.resolve(path.dirname(file), target);

        if (!fs.existsSync(resolved)) {
            throw new Error(`${relativeToRoot(file)} links to missing target ${target}`);
        }
    }
}

function loadAllowlist() {
    return readJson(path.join(sourceRoot, "reference", "curated-reference-allowlist.json"));
}

function validateAllowlist() {
    const allowlist = loadAllowlist();
    const outputs = new Set();

    if (!Array.isArray(allowlist.entrypoints) || allowlist.entrypoints.length === 0) {
        throw new Error("curated reference allowlist must contain at least one entrypoint");
    }

    for (const entry of allowlist.entrypoints) {
        if (!/^@scramjet\/[a-z0-9-]+$/.test(entry.package)) {
            throw new Error(`Invalid package in allowlist: ${entry.package}`);
        }

        if (!/^packages\/[a-z0-9-]+\/src\/[A-Za-z0-9_.\/-]+\.ts$/.test(entry.entrypoint)) {
            throw new Error(`Invalid allowlist entrypoint: ${entry.entrypoint}`);
        }

        if (entry.entrypoint.includes("..")) {
            throw new Error(`Unsafe allowlist entrypoint: ${entry.entrypoint}`);
        }

        if (!fs.existsSync(path.join(root, entry.entrypoint))) {
            throw new Error(`Allowlist entrypoint does not exist: ${entry.entrypoint}`);
        }

        if (!/^reference\/typescript\/[a-z0-9-]+\/$/.test(entry.outputPath)) {
            throw new Error(`Invalid allowlist outputPath: ${entry.outputPath}`);
        }

        if (outputs.has(entry.outputPath)) {
            throw new Error(`Duplicate allowlist outputPath: ${entry.outputPath}`);
        }

        outputs.add(entry.outputPath);

        if (!Array.isArray(entry.reviewers) || entry.reviewers.length === 0) {
            throw new Error(`Allowlist entry is missing reviewers: ${entry.entrypoint}`);
        }
    }

    return allowlist;
}

function validateSource() {
    if (!fs.existsSync(sourceRoot)) throw new Error("docs-source/ does not exist");

    const seenIds = new Set();
    const pages = [];

    for (const file of routedMarkdownFiles()) {
        const content = fs.readFileSync(file, "utf8");
        const frontmatter = parseFrontmatter(file, content);

        if (seenIds.has(frontmatter.id)) {
            throw new Error(`Duplicate docs id: ${frontmatter.id}`);
        }

        seenIds.add(frontmatter.id);
        validateLinks(file, content);
        pages.push({ file, frontmatter });
    }

    validateAllowlist();

    return pages;
}

function generatedMarker(sourcePath) {
    return `<!-- Generated by scripts/docs.js from ${sourcePath}. Do not edit this file directly. -->\n\n`;
}

function yamlString(value) {
    return JSON.stringify(value);
}

function withGeneratedMarkerAfterFrontmatter(file, content, sourcePath) {
    const match = /^(---\n[\s\S]*?\n---\n)/.exec(content);

    if (!match) throw new Error(`${relativeToRoot(file)} is missing YAML frontmatter`);

    return `${match[1]}\n${generatedMarker(sourcePath)}${content.slice(match[1].length)}`;
}

function generateContent(out, pages) {
    const contentOut = path.join(out.path, "content");
    const sidebar = [];

    for (const page of pages) {
        const relative = relativeToSource(page.file);
        const target = path.join(contentOut, relative);
        const content = fs.readFileSync(page.file, "utf8");

        writeFile(target, withGeneratedMarkerAfterFrontmatter(page.file, content, `docs-source/${relative}`));
        sidebar.push({
            id: page.frontmatter.id,
            title: page.frontmatter.title,
            slug: page.frontmatter.slug,
            source: `docs-source/${relative}`,
            output: relative
        });
    }

    writeFile(path.join(out.path, "sidebars", "content.json"), `${JSON.stringify(sidebar, null, 2)}\n`);

    return sidebar;
}

function generateReference(out) {
    const allowlist = validateAllowlist();
    const generated = [];

    for (const entry of allowlist.entrypoints) {
        const outputDir = path.join(out.path, entry.outputPath);
        const title = `${entry.package} reference`;
        const body = [
            "---",
            `id: ${entry.outputPath.replace(/^reference\/typescript\//, "reference-typescript-").replace(/\/$/, "")}`,
            `slug: /${entry.outputPath.replace(/\/$/, "")}`,
            `title: ${yamlString(title)}`,
            "---",
            "",
            generatedMarker("docs-source/reference/curated-reference-allowlist.json").trimEnd(),
            "",
            `# ${title}`,
            "",
            `- Package: \`${entry.package}\``,
            `- Entrypoint: \`${entry.entrypoint}\``,
            `- Stability: \`${entry.stability}\``,
            `- Audience: ${entry.audience.map((item) => `\`${item}\``).join(", ")}`,
            `- Reviewers: ${entry.reviewers.map((item) => `\`${item}\``).join(", ")}`,
            "",
            entry.reason,
            ""
        ];

        if (entry.notes) {
            body.push(`> ${entry.notes}`, "");
        }

        body.push(
            "Curated TypeScript API details will be generated for this entrypoint by the reference generator. This placeholder is emitted to make allowlist drift visible before the TypeScript reference renderer is added.",
            ""
        );

        writeFile(path.join(outputDir, "README.md"), body.join("\n"));
        generated.push(entry);
    }

    writeFile(path.join(out.path, "sidebars", "reference-typescript.json"), `${JSON.stringify(generated.map((entry) => ({
        package: entry.package,
        title: `${entry.package} reference`,
        stability: entry.stability,
        outputPath: `${entry.outputPath}README.md`
    })), null, 2)}\n`);

    return generated;
}

function sourceIdentifier() {
    const hash = crypto.createHash("sha256");
    const files = [
        ...listFiles(sourceRoot),
        path.join(root, "package.json"),
        path.join(root, "scripts", "docs.js")
    ].filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
        .sort();

    for (const file of files) {
        hash.update(relativeToRoot(file));
        hash.update("\0");
        hash.update(fs.readFileSync(file));
        hash.update("\0");
    }

    return `sha256:${hash.digest("hex")}`;
}

function generateMetadata(out, groups) {
    const metadata = {
        generatedBy: "scripts/docs.js",
        generatedAt: "1970-01-01T00:00:00.000Z",
        sourceIdentifier: sourceIdentifier(),
        outputRoot: {
            value: out.value,
            resolvedPath: out.resolvedPath || path.relative(root, out.path).split(path.sep).join("/"),
            source: out.source,
            envVar: "SCRAMJET_DOCS_OUTPUT_DIR",
            packageConfig: "scramjet.docs.outputDir"
        },
        groups,
        docusaurusHandoff: {
            content: "content/",
            reference: "reference/",
            readmes: "readmes/",
            sidebars: "sidebars/"
        },
        warnings: [
            "CLI reference generation, README generation, and API v2 documentation generation are implemented in later phases.",
            "Curated TypeScript reference pages are placeholder outputs until the TypeScript reference renderer is added."
        ]
    };

    writeFile(path.join(out.path, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
}

function removeGeneratedGroup(out, group) {
    if (group === "content") {
        removeDir(path.join(out.path, "content"));
        removeDir(path.join(out.path, "sidebars", "content.json"));
    }

    if (group === "reference") {
        removeDir(path.join(out.path, "reference", "typescript"));
        removeDir(path.join(out.path, "sidebars", "reference-typescript.json"));
    }
}

function existingGroups(out) {
    const metadataPath = path.join(out.path, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
        return { content: [], reference: [], readmes: [], sidebars: [] };
    }

    return readJson(metadataPath).groups || { content: [], reference: [], readmes: [], sidebars: [] };
}

function mergeSidebars(groups, sidebars) {
    return [...new Set([...(groups.sidebars || []), ...sidebars])];
}

function generate(customOut, scope = "all") {
    const out = customOut || outputRoot();
    const pages = validateSource();

    validateOutputRoot(out.path, { allowUnmarkedExisting: out.allowUnmarkedExisting });

    if (scope === "all" && fs.existsSync(out.path) && fs.existsSync(markerPath(out.path))) removeDir(out.path);
    ensureDir(out.path);
    writeMarker(out.path);
    const groups = scope === "all" ? { content: [], reference: [], readmes: [], sidebars: [] } : existingGroups(out);

    if (scope === "all" || scope === "content") {
        removeGeneratedGroup(out, "content");
        const content = generateContent(out, pages);

        groups.content = content.map((page) => page.output);
        groups.sidebars = mergeSidebars(groups, ["sidebars/content.json"]);
    }

    if (scope === "all" || scope === "reference") {
        removeGeneratedGroup(out, "reference");
        const reference = generateReference(out);

        groups.reference = reference.map((entry) => entry.outputPath);
        groups.sidebars = mergeSidebars(groups, ["sidebars/reference-typescript.json"]);
    }

    if (scope === "all") {
        ensureDir(path.join(out.path, "readmes"));
        ensureDir(path.join(out.path, "reference", "cli"));
        ensureDir(path.join(out.path, "reference", "api", "v2"));
        ensureDir(path.join(out.path, "reference", "api", "legacy", "v1"));
        groups.readmes = [];
    }

    generateMetadata(out, groups);

    console.log(`Generated docs export in ${path.relative(root, out.path) || "."}`);
}

function check() {
    validateSource();

    const out = outputRoot();

    if (fs.existsSync(out.path)) {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-docs-check-"));
        const tempOut = {
            path: tempRoot,
            source: out.source,
            value: out.value,
            resolvedPath: path.relative(root, out.path).split(path.sep).join("/"),
            allowUnmarkedExisting: true
        };

        try {
            generate(tempOut);
            const drift = compareDirs(tempRoot, out.path);

            if (drift.length > 0) {
                throw new Error(`Docs output drift detected:\n${drift.map((line) => `- ${line}`).join("\n")}`);
            }
        } finally {
            removeDir(tempRoot);
        }
    }

    if (!fs.existsSync(out.path)) {
        throw new Error(`Docs output root does not exist: ${out.path}. Run npm run docs:generate first.`);
    }

    console.log("Docs source validation passed.");
}

function main() {
    const command = process.argv[2] || "check";

    if (command === "clean") {
        cleanOutput(outputRoot().path);
        console.log("Removed docs export output.");
        return;
    }

    if (command === "generate") {
        generate();
        return;
    }

    if (command === "generate:content") {
        generate(undefined, "content");
        return;
    }

    if (command === "generate:reference") {
        generate(undefined, "reference");
        return;
    }

    if (command === "check") {
        check();
        return;
    }

    throw new Error(`Unknown docs command: ${command}`);
}

try {
    main();
} catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
}
