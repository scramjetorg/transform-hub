#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "docs-source");
const readmesSourceDir = path.join(sourceRoot, "readmes");
const packagesDir = path.join(root, "packages");

const GITHUB_BLOB_ROOT = "https://github.com/scramjetorg/transform-hub/blob/HEAD";
const GITHUB_TREE_ROOT = "https://github.com/scramjetorg/transform-hub/tree/HEAD";

const DESCRIPTION_OVERRIDES = {
    "adapter-kubernetes": "Kubernetes adapter for sequence storage, runner pod execution, CLI/config augmentation, and client initialization.",
    adapters: "Legacy adapter re-export barrel; prefer individual adapter packages (adapter-docker, adapter-kubernetes, adapter-process) for new usage.",
    "api-server": "HTTP API server for router construction, server setup, REST/stream handlers, middleware, and routed forwarding.",
    "obj-logger": "Object-mode structured logger with pipeable stream output, log level control, multi-target support, and source aggregation."
};

const SKIP_IMPORT_PACKAGES = new Set(["multi-manager"]);

const routedSections = ["intro", "transform-hub", "manager", "sequences", "testing", "cli", "api", "deployment", "development", "examples"];

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
    const selected = envOutput || configuredOutput || "docs";

    return {
        path: path.resolve(root, selected),
        source: envOutput ? "env" : configuredOutput ? "package" : "fallback",
        value: selected,
        writeRepoReadmes: false
    };
}

function listFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs
        .readdirSync(dir, { withFileTypes: true })
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

const EXPECTED_OUTPUT_MARKER = Object.freeze({ generatedBy: "scripts/docs.js" });

function validateOutputMarker(dir) {
    const file = markerPath(dir);
    if (!fs.existsSync(file)) throw new Error(`Refusing to use unmarked docs output root: ${path.resolve(dir)}`);

    let marker;
    try {
        marker = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        throw new Error(`Refusing to use invalid docs output marker: ${file}`);
    }

    const keys = marker && typeof marker === "object" && !Array.isArray(marker) ? Object.keys(marker) : [];
    if (keys.length !== 1 || keys[0] !== "generatedBy" || marker.generatedBy !== EXPECTED_OUTPUT_MARKER.generatedBy) {
        throw new Error(`Refusing to use foreign docs output marker: ${file}`);
    }
}

function validateOutputRoot(dir, options = {}) {
    const resolved = path.resolve(dir);
    const relative = path.relative(root, resolved);
    const protectedRoots = ["", ".", "docs-source", "conductor", "packages", "scripts", "src"];
    const isOutsideRoot = relative.startsWith("..");

    if (!isOutsideRoot && protectedRoots.some((protectedRoot) => relative === protectedRoot || relative.startsWith(`${protectedRoot}/`))) {
        throw new Error(`Refusing to use protected docs output root: ${resolved}`);
    }

    if (fs.existsSync(resolved)) {
        if (fs.existsSync(markerPath(resolved))) validateOutputMarker(resolved);
        else if (!options.allowUnmarkedExisting || options.requireMarker) {
            throw new Error(`Refusing to use unmarked docs output root: ${resolved}`);
        }
    }

    if (options.requireMarker && fs.existsSync(resolved)) validateOutputMarker(resolved);

    if (resolved === sourceRoot || resolved.startsWith(`${sourceRoot}${path.sep}`)) {
        throw new Error("Docs output root must not be inside docs-source/");
    }
}

function writeMarker(dir) {
    writeFile(markerPath(dir), `${JSON.stringify(EXPECTED_OUTPUT_MARKER, null, 2)}\n`);
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
        const value = line
            .slice(separator + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "");

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
    return routedSections.flatMap((section) => listFiles(path.join(sourceRoot, section))).filter((file) => file.endsWith(".md"));
}

function validateLinks(file, content) {
    const linkPattern = /\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(content))) {
        const target = match[1].split("#")[0];

        if (!target || target.startsWith("/")) continue;

        // Skip links to generated docs/ paths — they are created by docs:generate
        if (target.startsWith("../../docs/") || target.startsWith("../docs/") || target.startsWith("docs/")) continue;

        const resolved = path.resolve(path.dirname(file), target);

        if (!fs.existsSync(resolved)) {
            throw new Error(`${relativeToRoot(file)} links to missing target ${target}`);
        }
    }
}

function isSeparatorCell(cell) {
    return /^[\s:-]*$/.test(cell);
}

function isTableSeparatorRow(line) {
    if (!line.startsWith("|") || !line.endsWith("|")) return false;
    const cells = line.split("|");
    const contentCells = cells.slice(1, -1);
    return contentCells.length >= 2 && contentCells.every(isSeparatorCell);
}

function validateTableColumns(file, content) {
    const lines = content.split("\n");
    let inCodeBlock = false;

    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];

        if (/^```/.test(line.trim())) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        const headerLine = line.trim();
        if (!headerLine.startsWith("|") || !headerLine.endsWith("|")) continue;
        if (isTableSeparatorRow(headerLine)) continue;

        const sepLine = lines[i + 1].trim();
        if (!sepLine.startsWith("|") || !sepLine.endsWith("|")) continue;
        if (!isTableSeparatorRow(sepLine)) continue;

        const headerCols = headerLine.split("|").length - 2;
        const sepCols = sepLine.split("|").length - 2;

        if (headerCols < 2) continue;

        if (headerCols !== sepCols) {
            throw new Error(`${relativeToRoot(file)} line ${i + 1}: table header has ${headerCols} columns but separator (line ${i + 2}) has ${sepCols} columns`);
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

function loadReferenceEntryMap() {
    const allowlist = loadAllowlist();
    const map = {};

    for (const entry of allowlist.entrypoints) {
        const pkgName = entry.package.replace(/^@scramjet\//, "");

        if (!map[pkgName]) map[pkgName] = [];
        map[pkgName].push(entry);
    }

    return map;
}

function docsLink(context, pkgDir, refEntries) {
    if (refEntries && refEntries.length > 0) {
        const slug = refEntries[0].outputPath.replace(/\/$/, "");

        if (context === "docs") {
            return `../../../${slug}/README.md`;
        }
        if (context === "npm") {
            return `${GITHUB_BLOB_ROOT}/docs/${slug}/README.md`;
        }
        // repo context (packages/<pkg>/README.md)
        return `../../docs/${slug}/README.md`;
    }

    // No reference entry
    if (context === "docs") {
        return `${GITHUB_TREE_ROOT}/packages/${pkgDir}`;
    }
    if (context === "npm") {
        return `${GITHUB_BLOB_ROOT}/docs-source/README.md`;
    }
    // repo context
    return `../../docs-source/README.md`;
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
        validateTableColumns(file, content);
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
        let content = fs.readFileSync(page.file, "utf8");

        // Rewrite relative docs links for the output context.
        // Source files may use ../../docs/... links (which work on GitHub),
        // but in the docs/content/ output these need to drop the docs/ segment
        // to resolve correctly within the docs tree.
        content = content.replace(/\[([^\]]+)\]\(\.\.\/\.\.\/docs\//g, "[$1](../../");
        content = content.replace(/\[([^\]]+)\]\(\.\.\/docs\//g, "[$1](../");
        content = content.replace(/\[([^\]]+)\]\(docs\//g, "[$1](");
        content = content.replace(/\]\(\.\.\/\.\.\/conductor\//g, "](../../../conductor/");

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

    writeFile(
        path.join(out.path, "sidebars", "reference-typescript.json"),
        `${JSON.stringify(
            generated.map((entry) => ({
                package: entry.package,
                title: `${entry.package} reference`,
                stability: entry.stability,
                outputPath: `${entry.outputPath}README.md`
            })),
            null,
            2
        )}\n`
    );

    return generated;
}

// ============================================================
// CLI reference generation — source-derived from command descriptors
// ============================================================

const CLI_COMMANDS_DIR = path.join(root, "packages/cli/src/lib/commands");
const CLI_ROOT_SOURCE = "packages/cli/src/bin/index.ts";

function findMatching(text, openIndex, openChar = "(", closeChar = ")") {
    let depth = 1;
    let quote = null;
    let escaped = false;

    for (let i = openIndex + 1; i < text.length; i++) {
        const ch = text[i];

        if (quote) {
            if (escaped) {
                escaped = false;
            } else if (ch === "\\") {
                escaped = true;
            } else if (ch === quote) {
                quote = null;
            }
            continue;
        }

        if (ch === '"' || ch === "'" || ch === "`") {
            quote = ch;
        } else if (ch === openChar) {
            depth++;
        } else if (ch === closeChar) {
            depth--;
            if (depth === 0) return i;
        }
    }

    return -1;
}

function parseStringLiteralArgs(argsText) {
    const args = [];
    const re = /"((?:\\.|[^"])*)"/g;
    let match;

    while ((match = re.exec(argsText)) !== null) {
        args.push(match[1].replace(/\\"/g, '"'));
    }

    return args;
}

function findCmdCalls(text) {
    const calls = [];
    const re = /cmd\s*\(\s*"((?:\\.|[^"])*)"/g;
    let match;

    while ((match = re.exec(text)) !== null) {
        const open = text.indexOf("(", match.index);
        const close = findMatching(text, open);

        if (close === -1) continue;
        calls.push({
            name: match[1].replace(/\\"/g, '"'),
            start: match.index,
            end: close + 1,
            text: text.slice(match.index, close + 1)
        });
    }

    return calls;
}

function directNestedCmdCalls(text) {
    const calls = findCmdCalls(text).filter((call) => call.start !== 0);

    return calls.filter((call) => !calls.some((other) => other !== call && other.start < call.start && call.end <= other.end));
}

function parseChainString(commandText, methodName) {
    const methodRe = new RegExp(`\\.${methodName}\\s*\\(`);
    const match = methodRe.exec(commandText);

    if (!match) return undefined;
    const open = commandText.indexOf("(", match.index);
    const close = findMatching(commandText, open);

    if (close === -1) return undefined;
    const args = parseStringLiteralArgs(commandText.slice(open + 1, close));

    return args[0];
}

function parseChainStringPairs(commandText, methodName) {
    const pairs = [];
    const methodRe = new RegExp(`\\.${methodName}\\s*\\(`, "g");
    let match;

    while ((match = methodRe.exec(commandText)) !== null) {
        const open = commandText.indexOf("(", match.index);
        const close = findMatching(commandText, open);

        if (close === -1) continue;
        const args = parseStringLiteralArgs(commandText.slice(open + 1, close));

        if (args.length > 0) {
            pairs.push({ value: args[0], description: args[1] || "" });
        }
    }

    return pairs;
}

function parseCliCommandCall(call, source) {
    const children = directNestedCmdCalls(call.text).map((child) => parseCliCommandCall(child, source));
    let ownText = call.text;

    for (const child of findCmdCalls(call.text)
        .filter((nested) => nested.start !== 0)
        .sort((a, b) => b.start - a.start)) {
        ownText = `${ownText.slice(0, child.start)}${" ".repeat(child.end - child.start)}${ownText.slice(child.end)}`;
    }

    return {
        name: call.name,
        alias: parseChainString(ownText, "alias"),
        description: parseChainString(ownText, "desc") || "",
        usage: parseChainString(ownText, "usage") || "",
        arguments: parseChainStringPairs(ownText, "argument"),
        options: parseChainStringPairs(ownText, "option"),
        source,
        children
    };
}

function parseCliCommandFile(file) {
    const source = fs.readFileSync(file, "utf8");
    const relative = relativeToRoot(file);
    const exportedMatch = /export\s+const\s+\w+Command\s*:[^=]+?=\s*cmd\s*\(/.exec(source);
    const allCalls = findCmdCalls(source);

    if (!exportedMatch) return null;
    const rootCall = allCalls.find((call) => call.start >= exportedMatch.index);

    if (!rootCall) return null;
    const command = parseCliCommandCall(rootCall, relative);

    if (command.children.length === 0) {
        command.children = allCalls
            .filter((call) => call !== rootCall && !call.text.includes("developersOnly"))
            .filter((call) => !allCalls.some((other) => other !== call && other !== rootCall && other.start < call.start && call.end <= other.end))
            .map((call) => parseCliCommandCall(call, relative));
    }

    return command;
}

function commandSourceOrder() {
    const indexFile = path.join(CLI_COMMANDS_DIR, "index.ts");
    const source = fs.readFileSync(indexFile, "utf8");
    const order = [];
    const re = /import\s+\{\s*(\w+)Command\s*\}\s+from\s+"\.\/(\w+)"/g;
    let match;

    while ((match = re.exec(source)) !== null) {
        if (match[2] !== "developerTools") order.push(match[2]);
    }

    return order;
}

function parseCliCommandTree() {
    const byName = new Map();

    for (const name of commandSourceOrder()) {
        const file = path.join(CLI_COMMANDS_DIR, `${name}.ts`);

        if (!fs.existsSync(file)) continue;
        const command = parseCliCommandFile(file);

        if (command) byName.set(name, command);
    }

    return {
        name: "si",
        alias: "",
        description: "Scramjet Command Line Interface for Transform Hub and Cloud Platform.",
        usage: "[command] [options...]",
        arguments: [],
        options: [
            { value: "--config <profile-name>", description: "Use configuration from profile" },
            { value: "--config-path <path>", description: "Use configuration from file" },
            { value: "--progress", description: "Global flag, used to display progress (currently used only in 'si seq send/deploy' command" }
        ],
        source: CLI_ROOT_SOURCE,
        children: commandSourceOrder()
            .map((name) => byName.get(name))
            .filter(Boolean)
    };
}

function flattenCliCommands(command, parent = "") {
    const fullName = parent ? `${parent} ${command.name}` : command.name;
    const rows = [{ ...command, fullName }];

    for (const child of command.children || []) {
        rows.push(...flattenCliCommands(child, fullName));
    }

    return rows;
}

function cliCommandAnchor(command) {
    return command.fullName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function formatCliList(items) {
    if (!items || items.length === 0) return "_None._";

    return items.map((item) => `- \`${item.value}\`${item.description ? ` — ${item.description}` : ""}`).join("\n");
}

function generateCliReference(out) {
    const cliDir = path.join(out.path, "reference", "cli");
    const tree = parseCliCommandTree();
    const commands = flattenCliCommands(tree).filter((command) => command.fullName !== "si");
    const sidebar = [{ id: "reference-cli", title: "CLI Reference", slug: "/reference/cli", output: "reference/cli/index.md" }];

    removeDir(cliDir);
    ensureDir(cliDir);

    const indexLines = [
        "---",
        "id: reference-cli",
        "slug: /reference/cli",
        "title: CLI Reference",
        "---",
        "",
        generatedMarker("packages/cli/src/lib/commands/*.ts").trimEnd(),
        "",
        "# CLI Reference",
        "",
        "This reference is generated from the native CLI command descriptors in `packages/cli/src/lib/commands/*.ts` and the root command options in `packages/cli/src/bin/index.ts`.",
        "",
        "## Global options",
        "",
        formatCliList(tree.options),
        "",
        "## Commands",
        "",
        "| Command | Alias | Description | Source |",
        "|---------|-------|-------------|--------|"
    ];

    for (const command of commands) {
        indexLines.push(
            `| [\`${command.fullName}\`](commands.md#${cliCommandAnchor(command)}) | ${command.alias ? `\`${command.alias}\`` : "—"} | ${command.description || "—"} | \`${command.source}\` |`
        );
    }

    indexLines.push("");
    writeFile(path.join(cliDir, "index.md"), indexLines.join("\n"));

    const commandLines = [
        "---",
        "id: reference-cli-commands",
        "slug: /reference/cli/commands",
        "title: CLI Commands",
        "---",
        "",
        generatedMarker("packages/cli/src/lib/commands/*.ts").trimEnd(),
        "",
        "# CLI Commands",
        ""
    ];

    for (const command of commands) {
        commandLines.push(`## \`${command.fullName}\`${command.alias ? ` (alias: \`${command.alias}\`)` : ""}`, "");
        commandLines.push(command.description || "_No description provided._", "");
        commandLines.push(`- **Usage**: \`${command.fullName}${command.usage ? ` ${command.usage}` : ""}\``);
        commandLines.push(`- **Source**: \`${command.source}\``);
        commandLines.push("", "### Arguments", "", formatCliList(command.arguments), "");
        commandLines.push("### Options", "", formatCliList(command.options), "");

        if (command.children && command.children.length > 0) {
            commandLines.push("### Subcommands", "");
            for (const child of command.children) {
                const fullName = `${command.fullName} ${child.name}`;
                commandLines.push(
                    `- [\`${fullName}\`](#${fullName
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, "")})`
                );
            }
            commandLines.push("");
        }
    }

    writeFile(path.join(cliDir, "commands.md"), commandLines.join("\n"));
    sidebar.push({ id: "reference-cli-commands", title: "CLI Commands", slug: "/reference/cli/commands", output: "reference/cli/commands.md" });
    writeFile(path.join(out.path, "sidebars", "reference-cli.json"), `${JSON.stringify(sidebar, null, 2)}\n`);

    console.log(`Generated CLI reference documentation in reference/cli/ (${commands.length} commands)`);
}

function sourceIdentifier() {
    const hash = crypto.createHash("sha256");
    const files = [
        ...listFiles(sourceRoot),
        ...listFiles(CLI_COMMANDS_DIR).filter((file) => file.endsWith(".ts")),
        ...listPackages().map((pkgDir) => path.join(packagesDir, pkgDir, "package.json")),
        path.join(root, CLI_ROOT_SOURCE),
        path.join(root, "packages/rest-api2/src/routes.ts"),
        path.join(root, "package.json"),
        path.join(root, "scripts", "docs.js")
    ]
        .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile())
        .sort();

    for (const file of files) {
        hash.update(relativeToRoot(file));
        hash.update("\0");
        hash.update(fs.readFileSync(file));
        hash.update("\0");
    }

    return `sha256:${hash.digest("hex")}`;
}

function listPackages() {
    if (!fs.existsSync(packagesDir)) return [];

    return fs
        .readdirSync(packagesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(packagesDir, entry.name, "package.json")))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
}

function readPackageJson(pkgDir) {
    return readJson(path.join(packagesDir, pkgDir, "package.json"));
}

function loadExperimentalPackages() {
    const allowlist = loadAllowlist();
    const experimental = new Set();

    for (const entry of allowlist.entrypoints) {
        if (entry.stability === "experimental") {
            const name = entry.package.replace(/^@scramjet\//, "");
            experimental.add(name);
        }
    }

    return experimental;
}

function readmeSourceFilePath(pkgDir) {
    return path.join(readmesSourceDir, "packages", `${pkgDir}.md`);
}

function readmeSourcePath(file) {
    return `docs-source/readmes/${path.relative(readmesSourceDir, file).split(path.sep).join("/")}`;
}

function packageRowLink(context, pkgDir) {
    if (context === "docs") {
        return `${GITHUB_TREE_ROOT}/packages/${pkgDir}/`;
    }
    return `./packages/${pkgDir}/`;
}

function getDescription(pkgDir) {
    if (DESCRIPTION_OVERRIDES[pkgDir]) {
        return DESCRIPTION_OVERRIDES[pkgDir];
    }

    const pkg = readPackageJson(pkgDir);
    return (pkg.description || "").replace(/^This package is part of Scramjet Transform Hub\.\s*/i, "");
}

function generateRootReadme(out, repoReadmesOutputDir) {
    const sourceFile = path.join(readmesSourceDir, "root.md");

    if (!fs.existsSync(sourceFile)) {
        console.warn("Root README source not found, skipping root README generation.");
        return null;
    }

    let content = fs.readFileSync(sourceFile, "utf8");
    const pkgs = listPackages();

    // Build package list table (per-context links)
    const rows = pkgs.map((pkgDir) => {
        const pkg = readPackageJson(pkgDir);
        const name = pkg.name || `@scramjet/${pkgDir}`;
        const desc = getDescription(pkgDir);
        return `| [${name}](${packageRowLink("repo", pkgDir)}) | ${desc} |`;
    });

    const packageTable = ["| Package | Description |", "|---------|-------------|", ...rows, ""].join("\n");

    content = content.replace("<!-- PACKAGE-LIST -->", packageTable);

    const marker = generatedMarker(`docs-source/readmes/root.md`).trimEnd();
    content = `${content.trimEnd()}\n\n---\n\n${marker}\n`;

    // Write to repo root README when not in check/validation mode
    if (out.writeRepoReadmes !== false) {
        const target = repoReadmesOutputDir ? path.join(repoReadmesOutputDir, "README.md") : path.join(root, "README.md");
        writeFile(target, content);
    }

    return { content, relPath: "README.md", sourcePath: "docs-source/readmes/root.md" };
}

function generateRootReadmeDocs(out) {
    const sourceFile = path.join(readmesSourceDir, "root.md");

    if (!fs.existsSync(sourceFile)) {
        console.warn("Root README source not found, skipping root README generation.");
        return null;
    }

    let content = fs.readFileSync(sourceFile, "utf8");
    const pkgs = listPackages();

    // Build package list table with absolute GitHub URLs for docs context
    const rows = pkgs.map((pkgDir) => {
        const pkg = readPackageJson(pkgDir);
        const name = pkg.name || `@scramjet/${pkgDir}`;
        const desc = getDescription(pkgDir);
        return `| [${name}](${packageRowLink("docs", pkgDir)}) | ${desc} |`;
    });

    const packageTable = ["| Package | Description |", "|---------|-------------|", ...rows, ""].join("\n");

    content = content.replace("<!-- PACKAGE-LIST -->", packageTable);
    content = content
        .replaceAll("(./docs-source/", `(${GITHUB_BLOB_ROOT}/docs-source/`)
        .replaceAll("(./packages/", `(${GITHUB_TREE_ROOT}/packages/`)
        .replaceAll("(./docs/", "(../");
    content = content.replace(`(${GITHUB_BLOB_ROOT}/docs-source/)`, `(${GITHUB_TREE_ROOT}/docs-source/)`);

    const marker = generatedMarker(`docs-source/readmes/root.md`).trimEnd();
    content = `${content.trimEnd()}\n\n---\n\n${marker}\n`;

    return { content, relPath: "README.md", sourcePath: "docs-source/readmes/root.md" };
}

function generatePackageReadmeFor(context, out, pkgDir, experimental, refEntryMap, repoReadmesOutputDir) {
    const pkg = readPackageJson(pkgDir);
    const pkgName = pkg.name || `@scramjet/${pkgDir}`;
    const desc = DESCRIPTION_OVERRIDES[pkgDir] || pkg.description || "";
    const overlayFile = readmeSourceFilePath(pkgDir);
    const hasOverlay = fs.existsSync(overlayFile);
    const refEntries = refEntryMap[pkgDir];

    const lines = [`# ${pkgName}`, ""];

    // Stability notice for experimental packages
    if (experimental) {
        lines.push("> **⚠ Experimental**: This package is experimental. Its API may change without notice in minor or patch releases.");
        lines.push("");
    }

    if (hasOverlay) {
        // Use overlay content for the body
        let overlayContent = fs.readFileSync(overlayFile, "utf8").trim();

        if (context === "docs") {
            overlayContent = overlayContent.replaceAll("(../../docs-source/", `(${GITHUB_BLOB_ROOT}/docs-source/`);
            overlayContent = overlayContent.replaceAll("(../../docs/content/", "(../../../content/");
            overlayContent = overlayContent.replaceAll("(../../docs/", `(${GITHUB_BLOB_ROOT}/docs/`);
        }

        lines.push(overlayContent);
        lines.push("");
    } else if (desc) {
        lines.push(desc);
        lines.push("");
    }

    // Install section (always present)
    lines.push("## Install");
    lines.push("");
    lines.push("```bash");
    lines.push(`npm install ${pkgName}`);
    lines.push("```");
    lines.push("");

    if (!SKIP_IMPORT_PACKAGES.has(pkgDir)) {
        // Import section (present for library packages)
        lines.push("## Import");
        lines.push("");
        lines.push("```typescript");
        lines.push(`import { /* ... */ } from "${pkgName}";`);
        lines.push("```");
        lines.push("");
    }

    // Documentation link (context-specific)
    lines.push("## Documentation");
    lines.push("");

    const link = docsLink(context, pkgDir, refEntries);
    lines.push(`See the [package docs](${link}) for full documentation.`);
    lines.push("");

    const sourceRelPath = hasOverlay ? readmeSourcePath(overlayFile) : `packages/${pkgDir}/package.json`;
    const marker = generatedMarker(sourceRelPath);

    lines.push("---");
    lines.push("");
    lines.push(marker.trimEnd());

    const content = lines.join("\n");
    const relPath = `packages/${pkgDir}/README.md`;

    // Write to repo package README when not in check/validation mode
    if (context === "repo" && out.writeRepoReadmes !== false) {
        const target = repoReadmesOutputDir ? path.join(repoReadmesOutputDir, relPath) : path.join(packagesDir, pkgDir, "README.md");
        writeFile(target, content);
    }

    return { content, relPath, sourcePath: sourceRelPath };
}

function generateReadmes(out, repoReadmesOutputDir) {
    const readmesOut = path.join(out.path, "readmes");
    removeDir(readmesOut);
    ensureDir(readmesOut);

    const experimental = loadExperimentalPackages();
    const refEntryMap = loadReferenceEntryMap();
    const generated = [];
    const sidebar = [];
    const pkgs = listPackages();

    // Root README — repo context
    const rootResult = generateRootReadme(out, repoReadmesOutputDir);
    if (rootResult) {
        // Root README — docs context (absolute GitHub URLs)
        const rootDistDocs = generateRootReadmeDocs(out);
        writeFile(path.join(readmesOut, rootResult.relPath), rootDistDocs.content);
        generated.push(rootResult.relPath);
        sidebar.push({
            source: rootResult.sourcePath,
            output: rootResult.relPath
        });
    }

    // Package READMEs — repo context
    for (const pkgDir of pkgs) {
        const pkgResult = generatePackageReadmeFor("repo", out, pkgDir, experimental.has(pkgDir), refEntryMap, repoReadmesOutputDir);
        generated.push(pkgResult.relPath);
        sidebar.push({
            source: pkgResult.sourcePath,
            output: pkgResult.relPath
        });

        // Package READMEs — docs context
        const pkgDistDocs = generatePackageReadmeFor("docs", out, pkgDir, experimental.has(pkgDir), refEntryMap);
        writeFile(path.join(readmesOut, "packages", pkgDir, "README.md"), pkgDistDocs.content);
    }

    // Generate readmes sidebar with correct source metadata
    writeFile(path.join(out.path, "sidebars", "readmes.json"), `${JSON.stringify(sidebar, null, 2)}\n`);

    return generated;
}

const DIRECTORY_INDEX_START = "<!-- docs-directory-index:start -->";
const DIRECTORY_INDEX_END = "<!-- docs-directory-index:end -->";
const DIRECTORY_INDEX_MARKER = "<!-- Generated by scripts/docs.js: directory index. Do not edit this file directly. -->";

function directoryTitle(relative) {
    if (!relative) return "Documentation";
    const name = path.basename(relative);
    const special = { api: "API", cli: "CLI", readmes: "README Mirrors" };
    if (special[name]) return special[name];
    const words = name
        .split(/[-_]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
    return words.join(" ") || "Documentation";
}

function directoryIndexBody(relative, entries, collision) {
    const title = directoryTitle(relative);
    const lines = [DIRECTORY_INDEX_MARKER, "", `# ${title}`, ""];

    if (relative) lines.push("[Parent directory](../README.md)", "");
    lines.push("## Contents", "");

    if (collision) {
        lines.push("This directory contains a preserved hand-authored `README.md`. The generated navigation index is available at [`README.index.md`](README.index.md).", "");
    }

    if (entries.length === 0) {
        lines.push("_This directory is empty._", "");
    } else {
        for (const entry of entries) lines.push(`- [${entry.title}](${entry.href})`);
        lines.push("");
    }

    return lines.join("\n");
}

function generatePartials(out) {
    const source = path.join(sourceRoot, "_partials");
    const target = path.join(out.path, "partials");
    if (!fs.existsSync(source)) return;

    removeDir(target);
    const copy = (from, to) => {
        for (const entry of fs.readdirSync(from, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
            const sourceFile = path.join(from, entry.name);
            const targetFile = path.join(to, entry.name);
            if (entry.isDirectory()) copy(sourceFile, targetFile);
            else if (entry.isFile()) writeFile(targetFile, fs.readFileSync(sourceFile));
        }
    };
    copy(source, target);
}

function generateDirectoryIndexes(out) {
    const directories = [];
    const visit = (dir, relative = "") => {
        directories.push({ dir, relative });
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
            if (entry.isDirectory()) visit(path.join(dir, entry.name), relative ? `${relative}/${entry.name}` : entry.name);
        }
    };
    visit(out.path);

    const collisions = new Set(
        directories
            .filter(({ dir }) => fs.existsSync(path.join(dir, "README.md")))
            .filter(({ dir }) => !fs.readFileSync(path.join(dir, "README.md"), "utf8").includes("Generated by scripts/docs.js"))
            .map(({ relative }) => relative)
    );

    for (const { dir, relative } of directories.sort((left, right) => left.relative.localeCompare(right.relative))) {
        const entries = fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((entry) => entry.name !== ".scramjet-docs-output.json" && entry.name !== "README.md" && entry.name !== "README.index.md")
            .sort((left, right) => {
                if (left.isDirectory() !== right.isDirectory()) return left.isDirectory() ? -1 : 1;
                return left.name.localeCompare(right.name);
            })
            .map((entry) => {
                const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
                const href = entry.isDirectory() ? `${entry.name}/${collisions.has(childRelative) ? "README.index.md" : "README.md"}` : entry.name;
                return { title: entry.isDirectory() ? directoryTitle(childRelative) : entry.name, href };
            });
        const target = path.join(dir, "README.md");
        const collision = collisions.has(relative);
        const index = directoryIndexBody(relative, entries, collision);

        if (collision) {
            writeFile(path.join(dir, "README.index.md"), `${index}\n`);
            continue;
        }

        if (fs.existsSync(target)) {
            const original = fs.readFileSync(target, "utf8");
            const withoutIndex = original.replace(new RegExp(`\\n?${DIRECTORY_INDEX_START}[\\s\\S]*?${DIRECTORY_INDEX_END}\\n?`, "g"), "").trimEnd();
            writeFile(target, `${withoutIndex}\n\n${DIRECTORY_INDEX_START}\n${index}\n${DIRECTORY_INDEX_END}\n`);
        } else {
            writeFile(target, `${index}\n`);
        }
    }
}

function validateGeneratedLinks(dir) {
    for (const file of listFiles(dir).filter((file) => file.endsWith(".md"))) {
        const content = fs.readFileSync(file, "utf8");
        const links = /\[[^\]]+\]\(([^)]+)\)/g;
        let match;
        while ((match = links.exec(content))) {
            const target = match[1].split("#")[0];
            if (!target || /^(?:https?:|mailto:|data:|\/)/.test(target)) continue;
            const resolved = path.resolve(path.dirname(file), target);
            if (!fs.existsSync(resolved)) throw new Error(`${relativeToRoot(file)} links to missing generated target ${target}`);
        }
    }
}

function generateMetadata(out, groups) {
    const allowlist = loadAllowlist();
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
        curatedReferences: allowlist.entrypoints.map((entry) => ({
            package: entry.package,
            entrypoint: entry.entrypoint,
            outputPath: entry.outputPath,
            stability: entry.stability,
            audience: entry.audience,
            reviewers: entry.reviewers
        })),
        docusaurusHandoff: {
            content: "content/",
            reference: "reference/",
            readmes: "readmes/",
            sidebars: "sidebars/"
        },
        warnings: [
            "API v2 documentation is generated from packages/rest-api2/src/routes.ts RestAPI2RouteTree definitions.",
            "Legacy v1 API documentation mirrors docs-source/api/legacy/v1-api-client.md under reference/api/legacy/v1/.",
            "CLI reference documentation is generated from packages/cli/src/lib/commands/*.ts command descriptors.",
            "README mirror generation is active; root README.md is directly maintained and package README updates require docs:sync:readmes.",
            "Curated TypeScript reference pages are placeholder outputs until the TypeScript reference renderer is added."
        ]
    };

    writeFile(path.join(out.path, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
}

// ============================================================
// API v2 route definitions — parsed from packages/rest-api2/src/routes.ts
// ============================================================

const API_V2_SOURCE_PATH = path.join(root, "packages/rest-api2/src/routes.ts");
const API_V2_BASE_PATHS = {
    root: "/api/v2",
    space: "/api/v2/spaces/:spaceId",
    hub: "/api/v2/spaces/:spaceId/hubs/:hubId",
    sequence: "/api/v2/spaces/:spaceId/hubs/:hubId/sequences",
    instance: "/api/v2/spaces/:spaceId/hubs/:hubId/instances/:instanceId"
};

function parseAPIV2RouteSet(source, funcName) {
    // Find the function: function funcName() { ... }
    const funcRe = new RegExp(`function\\s+${funcName}\\s*\\(\\)\\s*\\{`);
    const funcStart = source.search(funcRe);
    if (funcStart === -1) throw new Error(`Cannot find function ${funcName} in routes.ts`);

    // Find the matching closing brace for the function body
    // The function body starts after the first '{'
    const bodyStart = source.indexOf("{", funcStart) + 1;
    let depth = 1;
    let pos = bodyStart;
    while (depth > 0 && pos < source.length) {
        const ch = source[pos];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        pos++;
    }
    const body = source.slice(bodyStart, pos - 1);

    const routes = [];
    // Match each route entry: key: Router.method(...) or key: Router.route("method", ...)
    // Two patterns:
    //   1) key: Router.get|post|put|delete|patch(
    //   2) key: Router.route("method",
    const entryRe = /(\w+)\s*:\s*Router\.(?:route\s*\(\s*"(\w+)"|(get|post|put|delete|patch)\s*\()/g;
    let entryMatch;
    while ((entryMatch = entryRe.exec(body)) !== null) {
        const key = entryMatch[1];
        let method;
        let argsStart;

        if (entryMatch[3]) {
            // Pattern 1: Router.get/post/put/delete/patch
            method = entryMatch[3].toUpperCase();
            argsStart = entryMatch.index + entryMatch[0].length;
        } else {
            // Pattern 2: Router.route("method", ...)
            method = entryMatch[2].toUpperCase();
            // Find second argument start (after the quoted method and comma)
            const afterMethod = body.indexOf(",", entryMatch.index + entryMatch[0].length);
            argsStart = afterMethod + 1;
        }

        // Extract the path string
        const pathMatch = body.slice(argsStart).match(/^\s*"([^"]*)"/);
        if (!pathMatch) continue;
        const routePath = pathMatch[1];
        const restStart = argsStart + pathMatch[0].length;

        // Extract options: { ... }
        const optsMatch = body.slice(restStart).match(/^\s*,\s*(\{)/);
        if (!optsMatch) {
            routes.push({ key, method: method, path: routePath });
            continue;
        }

        const optsBodyStart = restStart + optsMatch.index + optsMatch[0].length - 1; // position of {
        let depth2 = 1;
        let pos2 = optsBodyStart + 1;
        while (depth2 > 0 && pos2 < body.length) {
            const ch2 = body[pos2];
            if (ch2 === "{") depth2++;
            else if (ch2 === "}") depth2--;
            pos2++;
        }
        const optsText = body.slice(optsBodyStart, pos2);

        // Parse kind
        let kind = undefined;
        const kindMatch = optsText.match(/\bkind\s*:\s*"([^"]+)"/);
        if (kindMatch) kind = kindMatch[1];

        // Parse opaque
        let opaque = false;
        if (/\bopaque\s*:\s*true/.test(optsText)) opaque = true;

        // Parse schemas
        const schemas = {};
        const schemasMatch = optsText.match(/\bschemas\s*:\s*\{([^}]*)\}/);
        if (schemasMatch) {
            const schemasText = schemasMatch[1];
            const schemaEntryRe = /(\w+)\s*:\s*([^,}]+)/g;
            let sMatch;
            while ((sMatch = schemaEntryRe.exec(schemasText)) !== null) {
                const skey = sMatch[1];
                let sval = sMatch[2].trim();
                // Simplify schema references: remove RestAPI2Schemas.xxx. prefix, handle function calls
                sval = sval.replace(/RestAPI2Schemas\.[a-z]+\./g, "");
                sval = sval.replace(/\.optional\(\)/g, "(optional)");
                schemas[skey] = sval;
            }
        }

        routes.push({ key, method, path: routePath, kind, schemas, opaque });
    }

    return routes;
}

function parseAPIV2ResolverSet(source, funcName) {
    const funcRe = new RegExp(`function\\s+${funcName}\\s*\\(`);
    const funcStart = source.search(funcRe);
    if (funcStart === -1) return null;

    const bodyStart = source.indexOf("{", funcStart) + 1;
    let depth = 1;
    let pos = bodyStart;
    while (depth > 0 && pos < source.length) {
        const ch = source[pos];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        pos++;
    }
    const body = source.slice(bodyStart, pos - 1);

    // Find Router.resolve("PATH", { ... })
    const resolveMatch = body.match(/Router\.resolve\s*\(\s*"([^"]+)"\s*,\s*\{/);
    if (!resolveMatch) return null;

    const resolverPath = resolveMatch[1];
    // Find the options object
    const optsStart = body.indexOf("{", resolveMatch.index + resolveMatch[0].length - 1) + 1;
    depth = 1;
    pos = optsStart;
    while (depth > 0 && pos < body.length) {
        const ch = body[pos];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        pos++;
    }
    const optsText = body.slice(optsStart, pos - 1);

    // Parse schemas
    const schemas = {};
    const schemasMatch = optsText.match(/\bschemas\s*:\s*\{([^}]*)\}/);
    if (schemasMatch) {
        const schemaEntryRe = /(\w+)\s*:\s*([^,}]+)/g;
        let sMatch;
        while ((sMatch = schemaEntryRe.exec(schemasMatch[1])) !== null) {
            let sval = sMatch[2].trim();
            sval = sval.replace(/RestAPI2Schemas\.[a-z]+\./g, "");
            schemas[sMatch[1]] = sval;
        }
    }

    // Parse targetDefinitions
    let targetOwner = "";
    let mountPath = "";
    let implementerBasePath = undefined;
    const tdMatch = optsText.match(/targetDefinitions\s*:\s*\{([^}]*)\}/);
    if (tdMatch) {
        const ownerMatch = tdMatch[1].match(/\bowner\s*:\s*"([^"]+)"/);
        if (ownerMatch) targetOwner = ownerMatch[1];
        const mountMatch = tdMatch[1].match(/\bmountPath\s*:\s*"([^"]+)"/);
        if (mountMatch) mountPath = mountMatch[1];
        const impMatch = tdMatch[1].match(/\bimplementerBasePath\s*:\s*"([^"]+)"/);
        if (impMatch) implementerBasePath = impMatch[1];
    }

    return { path: resolverPath, schemas, targetOwner, mountPath, implementerBasePath };
}

function parseAPIV2Tree(source) {
    // Find the RestAPI2RouteTree definition
    const treeStart = source.indexOf("export const RestAPI2RouteTree = {");
    if (treeStart === -1) throw new Error("Cannot find RestAPI2RouteTree in routes.ts");

    const bodyStart = source.indexOf("{", treeStart) + 1;
    let depth = 1;
    let pos = bodyStart;
    while (depth > 0 && pos < source.length) {
        const ch = source[pos];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        pos++;
    }
    const treeText = source.slice(bodyStart, pos - 1);

    // Extract each top-level node by scanning the tree object body at depth 1.
    // Walk through treeText character by character tracking brace depth.
    // At depth 0 (in the tree object), capture keys.
    const nodeNames = ["root", "space", "hub", "sequence", "instance"];
    const tree = {};
    const topLevelNodes = {};
    let depth0 = 0;
    let i = 0;
    let currentKey = null;
    let currentStart = -1;
    while (i < treeText.length) {
        if (treeText[i] === "{") {
            if (depth0 === 0) {
                // Starting a new object — if we have a pending key, record its value start
                if (currentKey) currentStart = i + 1;
            }
            depth0++;
        } else if (treeText[i] === "}") {
            depth0--;
            if (depth0 === 0 && currentKey && currentStart !== -1) {
                // End of a depth-1 object value
                const nodeText = treeText.slice(currentStart, i);
                topLevelNodes[currentKey] = nodeText;
                currentKey = null;
                currentStart = -1;
            }
        } else if (depth0 === 0) {
            // At depth 0, look for key: patterns
            const keyMatch = treeText.slice(i).match(/^(\w+)\s*:/);
            if (keyMatch) {
                currentKey = keyMatch[1];
                i += keyMatch[0].length - 1;
            }
        }
        i++;
    }

    for (const nodeName of nodeNames) {
        const nodeText = topLevelNodes[nodeName];
        if (!nodeText) continue;

        // Parse concept
        const conceptMatch = nodeText.match(/\bconcept\s*:\s*"([^"]+)"/);
        // Parse owner
        const ownerMatch = nodeText.match(/\bowner\s*:\s*"([^"]+)"/);
        // Parse routes factory name
        const routesMatch = nodeText.match(/\broutes\s*:\s*(\w+)/);

        const groups = parseAPIV2TreeGroups(nodeText);
        const children = parseAPIV2TreeChildren(nodeText);

        tree[nodeName] = {
            concept: conceptMatch ? conceptMatch[1] : "",
            owner: ownerMatch ? ownerMatch[1] : "",
            routesFactory: routesMatch ? routesMatch[1] : null,
            groups: groups,
            children: children
        };
    }

    return tree;
}

function extractObjectProperty(text, propertyName) {
    const propertyRe = new RegExp(`\\b${propertyName}\\s*:\\s*\\{`);
    const propertyStart = text.search(propertyRe);
    if (propertyStart === -1) return null;

    const openBrace = text.indexOf("{", propertyStart);
    let depth = 1;
    let pos = openBrace + 1;

    while (depth > 0 && pos < text.length) {
        const ch = text[pos];

        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        pos++;
    }

    if (depth !== 0) return null;
    return text.slice(openBrace + 1, pos - 1);
}

function parseObjectEntries(text) {
    const entries = [];
    let i = 0;

    while (i < text.length) {
        const keyMatch = text.slice(i).match(/^\s*(\w+)\s*:\s*\{/);

        if (!keyMatch) {
            i++;
            continue;
        }

        const key = keyMatch[1];
        const openBrace = i + keyMatch[0].lastIndexOf("{");
        let depth = 1;
        let pos = openBrace + 1;

        while (depth > 0 && pos < text.length) {
            const ch = text[pos];

            if (ch === "{") depth++;
            else if (ch === "}") depth--;
            pos++;
        }

        if (depth !== 0) break;
        entries.push({ key, text: text.slice(openBrace + 1, pos - 1) });
        i = pos;
    }

    return entries;
}

function parseAPIV2TreeGroups(nodeText) {
    const groupsText = extractObjectProperty(nodeText, "groups");
    if (!groupsText) return [];

    return parseObjectEntries(groupsText).map(({ key, text }) => {
        const group = { name: key };
        const rkMatch = text.match(/\brouteKeys\s*:\s*\[([^\]]*)\]/);

        if (rkMatch) {
            group.routeKeys = rkMatch[1]
                .split(",")
                .map((s) => s.trim().replace(/^"|"$/g, ""))
                .filter(Boolean);
        }

        const nodeRefMatch = text.match(/\bnode\s*:\s*"([^"]+)"/);
        if (nodeRefMatch) group.node = nodeRefMatch[1];

        const routesRefMatch = text.match(/\broutes\s*:\s*(\w+)/);
        if (routesRefMatch) group.routes = routesRefMatch[1];

        if (/\bopaque\s*:\s*true/.test(text)) group.opaque = true;

        return group;
    });
}

function parseAPIV2TreeChildren(nodeText) {
    const childrenText = extractObjectProperty(nodeText, "children");
    if (!childrenText) return [];

    return parseObjectEntries(childrenText).map(({ text }) => {
        const resolverMatch = text.match(/\bresolver\s*:\s*"([^"]+)"/);
        const nodeMatch = text.match(/\bnode\s*:\s*"([^"]+)"/);

        return {
            resolver: resolverMatch ? resolverMatch[1] : "",
            node: nodeMatch ? nodeMatch[1] : ""
        };
    });
}

function parseAPIV2FromSource() {
    const source = fs.readFileSync(API_V2_SOURCE_PATH, "utf8");
    const tree = parseAPIV2Tree(source);

    const routeSetToFuncName = {
        root: "rootRouteSet",
        space: "spaceRouteSet",
        hub: "hubRouteSet",
        sequence: "sequenceRouteSet",
        instance: "instanceRouteSet"
    };
    const resolverSetToFuncName = {
        root: "rootResolverSet",
        space: "spaceResolverSet",
        hub: "hubResolverSet"
    };

    const nodes = {};
    const nodeNames = ["root", "space", "hub", "sequence", "instance"];

    for (const nodeName of nodeNames) {
        const treeNode = tree[nodeName];
        if (!treeNode) throw new Error(`Missing tree node: ${nodeName}`);

        // Parse routes from the route set function
        const funcName = routeSetToFuncName[nodeName];
        const routes = parseAPIV2RouteSet(source, funcName);

        // Parse resolver
        let resolver = null;
        const resolverFuncName = resolverSetToFuncName[nodeName];
        if (resolverFuncName) {
            const parsedResolver = parseAPIV2ResolverSet(source, resolverFuncName);
            if (parsedResolver) {
                resolver = {
                    key: parsedResolver.path.split("/").pop()?.replace(/:.*/, "") || "",
                    path: parsedResolver.path,
                    schemas: parsedResolver.schemas,
                    targetOwner: parsedResolver.targetOwner,
                    mountPath: parsedResolver.mountPath
                };
                if (parsedResolver.implementerBasePath) {
                    resolver.implementerBasePath = parsedResolver.implementerBasePath;
                }
                // Set resolver key from targetOwner
                resolver.key = resolver.targetOwner;
            }
        }

        // Convert groups to array format
        const nodeGroups = (treeNode.groups || []).map((g) => {
            const group = { name: g.name };
            if (g.routeKeys) group.routeKeys = g.routeKeys;
            if (g.node) group.node = g.node;
            if (g.routes) group.routes = g.routes;
            if (g.opaque) group.opaque = true;
            return group;
        });

        // Build children array
        const nodeChildren = (treeNode.children || []).map((c) => ({
            resolver: c.resolver,
            node: c.node
        }));

        nodes[nodeName] = {
            concept: treeNode.concept,
            owner: treeNode.owner,
            routes,
            groups: nodeGroups.length > 0 ? nodeGroups : undefined,
            children: nodeChildren.length > 0 ? nodeChildren : undefined,
            basePath: API_V2_BASE_PATHS[nodeName]
        };

        if (resolver) {
            nodes[nodeName].resolver = resolver;
        }
    }

    return nodes;
}

const API_V2_NODES = parseAPIV2FromSource();
const API_V2_NODE_NAMES = ["root", "space", "hub", "sequence", "instance"];

function routeKindBadge(kind) {
    if (!kind || kind === "request") return "";
    return ` \`${kind}\``;
}

function schemasList(schemas) {
    if (!schemas) return "—";
    const parts = [];
    for (const [key, val] of Object.entries(schemas)) {
        if (val) parts.push(`\`${key}\`: \`${val}\``);
    }
    return parts.join(", ") || "—";
}

function makeFullPath(nodeName, routePath) {
    const base = API_V2_BASE_PATHS[nodeName] || "";
    // Remove trailing slash from base if routePath starts with /
    if (routePath === "/" && base) return base;
    if (routePath.startsWith("/")) return base + routePath;
    if (!base) return routePath;
    return base + "/" + routePath;
}

function generateAPIV2(out) {
    const apiDir = path.join(out.path, "reference", "api", "v2");
    removeDir(apiDir);
    ensureDir(apiDir);

    const sidebar = [];

    // Index page
    const indexLines = [
        "---",
        `id: reference-api-v2`,
        `slug: /reference/api/v2`,
        `title: API v2 Reference`,
        "---",
        "",
        generatedMarker("packages/rest-api2/src/routes.ts").trimEnd(),
        "",
        "# API v2 Reference",
        "",
        "This reference is generated from the `RestAPI2RouteTree` definition in `packages/rest-api2/src/routes.ts`. It documents all available route nodes, their operations, schemas, and relationships.",
        "",
        "## Route Tree Overview",
        "",
        "The API v2 route tree is organized hierarchically:",
        "",
        "```",
        "root",
        " └─ /spaces/:spaceId → space",
        "     ├─ (space routes + storage routes)",
        "     ├─ /hubs/:hubId → hub",
        "     │   ├─ (hub routes)",
        "     │   ├─ /sequences → sequence (mounted sub-router)",
        "     │   └─ /instances/:instanceId → instance",
        "     │       └─ (instance routes including stdio, events, rpc)",
        "     └─ (topic routes: read, write)",
        "```",
        "",
        "### Nodes",
        ""
    ];

    for (const nodeName of API_V2_NODE_NAMES) {
        const node = API_V2_NODES[nodeName];
        indexLines.push(`- [${nodeName}](${nodeName}.md) — ${node.concept} routes (owner: \`${node.owner}\`)`);
    }

    indexLines.push("", "### Route kinds", "");
    indexLines.push("Routes carry a **kind** that describes stream semantics:");
    indexLines.push("");
    indexLines.push("| Kind | Description |");
    indexLines.push("|------|-------------|");
    indexLines.push("| *(normal/request)* | Standard REST request-response |");
    indexLines.push("| `upstream` | Server-to-client stream (read data from the server) |");
    indexLines.push("| `downstream` | Client-to-server stream (send data to the server) |");
    indexLines.push("| `duplex` | Bidirectional stream (both directions) |");
    indexLines.push("");

    writeFile(path.join(apiDir, "index.md"), indexLines.join("\n"));
    sidebar.push({ id: "reference-api-v2", title: "API v2 Reference", slug: "/reference/api/v2", output: "reference/api/v2/index.md" });

    // Node pages
    for (const nodeName of API_V2_NODE_NAMES) {
        const node = API_V2_NODES[nodeName];
        const lines = [
            "---",
            `id: reference-api-v2-${nodeName}`,
            `slug: /reference/api/v2/${nodeName}`,
            `title: API v2 — ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} routes`,
            "---",
            "",
            generatedMarker("packages/rest-api2/src/routes.ts").trimEnd(),
            "",
            `# ${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} routes`,
            "",
            `- **Concept**: \`${node.concept}\``,
            `- **Owner**: \`${node.owner}\``,
            ""
        ];

        // Groups
        if (node.groups && node.groups.length > 0) {
            lines.push("### Route groups", "");
            for (const group of node.groups) {
                const names = group.routeKeys ? group.routeKeys.join(", ") : group.name;
                const tag = group.opaque ? " (opaque)" : group.node ? ` (mounted node: \`${group.node}\`)` : "";
                lines.push(`- **${group.name}**: ${names}${tag}`);
            }
            lines.push("");
        }

        // Resolver (child relationship)
        if (node.resolver) {
            lines.push("### Child resolver", "");
            lines.push(`Routes can be resolved to a child \`${node.resolver.targetOwner}\` via:`, "");
            lines.push(`- **Resolver key**: \`${node.resolver.key}\``);
            lines.push(`- **Path pattern**: \`${node.resolver.path}\``);
            lines.push(`- **Mount path**: \`${node.resolver.mountPath}\``);
            if (node.resolver.implementerBasePath) {
                lines.push(`- **Implementer base path**: \`${node.resolver.implementerBasePath}\``);
            }
            lines.push(`- **Schemas**: ${schemasList(node.resolver.schemas)}`);
            lines.push("");
        }

        // Children
        if (node.children && node.children.length > 0) {
            lines.push("### Child nodes", "");
            for (const child of node.children) {
                lines.push(`- \`${child.node}\` (via resolver \`${child.resolver}\`)`);
            }
            lines.push("");
        }

        // Mounted sub-routers
        if (node.groups) {
            const mountedGroups = node.groups.filter((g) => g.node && g.routes);
            if (mountedGroups.length > 0) {
                lines.push("### Mounted sub-routers", "");
                lines.push("The following sub-routers are mounted under this node:", "");
                for (const group of mountedGroups) {
                    const mountPath = API_V2_BASE_PATHS[group.node] || group.name;
                    lines.push(`- \`${mountPath}\` → **${group.node}** route set`);
                }
                lines.push("");
            }
        }

        // Route table
        lines.push("### Routes", "");
        lines.push("| Operation | Method | Path (full) | Kind | Schemas |");
        lines.push("|-----------|--------|-------------|------|---------|");

        for (const route of node.routes) {
            const fullPath = makeFullPath(nodeName, route.path);
            const opId = `${route.method.toUpperCase()} ${fullPath}`;
            const kind = route.kind || "request";
            const schemas = schemasList(route.schemas);
            lines.push(`| \`${route.key}\` | \`${route.method.toUpperCase()}\` | \`${fullPath}\` | ${kind} | ${schemas} |`);
        }

        lines.push("");

        // Per-route detail
        lines.push("### Route details", "");
        for (const route of node.routes) {
            const fullPath = makeFullPath(nodeName, route.path);
            const opId = `${route.method.toUpperCase()} ${fullPath}`;
            lines.push(`#### \`${route.key}\``, "");
            lines.push(`- **Operation ID**: \`${opId}\``);
            lines.push(`- **Method**: \`${route.method.toUpperCase()}\``);
            lines.push(`- **Path (full)**: \`${fullPath}\``);
            lines.push(`- **Path (node-local)**: \`${route.path}\``);
            if (route.kind) {
                lines.push(`- **Kind**: \`${route.kind}\``);
            }
            if (route.opaque) {
                lines.push(
                    `- **Opaque**: This route belongs to an opaque group. The server does not expose its internal structure; the client must use the documented contract directly.`
                );
            }
            const schemas = schemasList(route.schemas);
            if (schemas !== "—") {
                lines.push(`- **Schemas**: ${schemas}`);
            }
            lines.push("");
        }

        writeFile(path.join(apiDir, `${nodeName}.md`), lines.join("\n"));
        sidebar.push({
            id: `reference-api-v2-${nodeName}`,
            title: `${nodeName.charAt(0).toUpperCase() + nodeName.slice(1)} routes`,
            slug: `/reference/api/v2/${nodeName}`,
            output: `reference/api/v2/${nodeName}.md`
        });
    }

    // Write sidebar
    writeFile(path.join(out.path, "sidebars", "reference-api-v2.json"), `${JSON.stringify(sidebar, null, 2)}\n`);

    console.log(`Generated API v2 documentation in reference/api/v2/ (${API_V2_NODE_NAMES.length + 1} pages)`);
}

function generateLegacyV1(out) {
    const apiV1Dir = path.join(out.path, "reference", "api", "legacy", "v1");
    const apiV1IndexFile = path.join(apiV1Dir, "index.md");
    removeDir(apiV1Dir);
    ensureDir(apiV1Dir);

    const sourceFile = path.join(sourceRoot, "api", "legacy", "v1-api-client.md");
    const sourceContent = fs.existsSync(sourceFile) ? fs.readFileSync(sourceFile, "utf8") : "";

    // Extract body content (after frontmatter)
    let bodyContent = sourceContent;
    const frontmatterMatch = /^---\n[\s\S]*?\n---\n/.exec(sourceContent);
    if (frontmatterMatch) {
        bodyContent = sourceContent.slice(frontmatterMatch[0].length);
    }

    // Rewrite body content relative links to work from the output location.
    // Source is at docs-source/api/legacy/v1-api-client.md (depth 3 from sourceRoot).
    // Output is at docs/reference/api/legacy/v1/index.md (depth 4 from docs root).
    // We resolve each link against the source file dir and re-emit relative to the output file dir.
    // Use a stepwise approach: find all relative markdown links, resolve, rebase.
    bodyContent = bodyContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, link) => {
        // Skip absolute URLs, mailto, anchors, or absolute paths
        if (/^(https?:|mailto:|#|\/)/.test(link)) return match;
        const targetPart = link.split("#")[0];
        if (!targetPart) return match;
        // Resolve against the source file's directory
        const resolvedSource = path.resolve(path.dirname(sourceFile), targetPart);
        // Find the path relative to sourceRoot
        const relToSourceRoot = path.relative(sourceRoot, resolvedSource).split(path.sep).join("/");
        // The content mirror lives at docs/content/<relToSourceRoot>
        // Output is at docs/reference/api/legacy/v1/index.md
        const contentMirrorPath = path.join("content", relToSourceRoot);
        // Compute relative path from output file to content mirror
        const outputDir = path.dirname(apiV1IndexFile);
        const relLink = path.relative(outputDir, path.join(out.path, contentMirrorPath)).split(path.sep).join("/");
        const hashPart = link.includes("#") ? "#" + link.split("#")[1] : "";
        return "[" + text + "](" + relLink + hashPart + ")";
    });

    const indexLines = [
        "---",
        "id: reference-api-legacy-v1",
        "slug: /reference/api/legacy/v1",
        "title: Legacy v1 API Reference",
        "---",
        "",
        generatedMarker("docs-source/api/legacy/v1-api-client.md").trimEnd(),
        "",
        "# Legacy v1 API Reference",
        "",
        "> **Backwards compatibility**: The v1 API (route tree `/api/v1`, package `@scramjet/api-client`) remains available and supported for existing deployments. New projects should use the [API v2 reference](../../v2/index.md).",
        "",
        "This page mirrors the content from \`docs-source/api/legacy/v1-api-client.md\`.",
        "",
        bodyContent.trim(),
        ""
    ];

    writeFile(path.join(apiV1Dir, "index.md"), indexLines.join("\n"));

    // Write sidebar
    const sidebar = [
        {
            id: "reference-api-legacy-v1",
            title: "Legacy v1 API Reference",
            slug: "/reference/api/legacy/v1",
            output: "reference/api/legacy/v1/index.md"
        }
    ];
    writeFile(path.join(out.path, "sidebars", "reference-api-legacy-v1.json"), `${JSON.stringify(sidebar, null, 2)}\n`);

    console.log("Generated legacy v1 API documentation in reference/api/legacy/v1/");
}

function removeGeneratedGroup(out, group) {
    if (group === "content") {
        removeDir(path.join(out.path, "content"));
        removeDir(path.join(out.path, "sidebars", "content.json"));
    }

    if (group === "reference") {
        removeDir(path.join(out.path, "reference", "typescript"));
        removeDir(path.join(out.path, "reference", "cli"));
        removeDir(path.join(out.path, "sidebars", "reference-typescript.json"));
        removeDir(path.join(out.path, "sidebars", "reference-cli.json"));
    }

    if (group === "readmes") {
        removeDir(path.join(out.path, "readmes"));
        removeDir(path.join(out.path, "sidebars", "readmes.json"));
    }

    if (group === "api") {
        removeDir(path.join(out.path, "reference", "api"));
        removeDir(path.join(out.path, "sidebars", "reference-api-v2.json"));
        removeDir(path.join(out.path, "sidebars", "reference-api-legacy-v1.json"));
    }
}

function existingGroups(out) {
    const metadataPath = path.join(out.path, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
        return { content: [], reference: [], readmes: [], sidebars: [], api: [] };
    }

    return readJson(metadataPath).groups || { content: [], reference: [], readmes: [], sidebars: [], api: [] };
}

function mergeSidebars(groups, sidebars) {
    return [...new Set([...(groups.sidebars || []), ...sidebars])];
}

function generateInto(customOut, scope = "all") {
    const out = customOut || outputRoot();
    const pages = validateSource();

    validateOutputRoot(out.path, { allowUnmarkedExisting: out.allowUnmarkedExisting });

    if (scope === "all" && fs.existsSync(out.path) && fs.existsSync(markerPath(out.path))) removeDir(out.path);
    ensureDir(out.path);
    writeMarker(out.path);
    const groups = scope === "all" ? { content: [], reference: [], readmes: [], sidebars: [], api: [] } : existingGroups(out);

    if (scope === "all" || scope === "content") {
        removeGeneratedGroup(out, "content");
        const content = generateContent(out, pages);

        groups.content = content.map((page) => page.output);
        groups.sidebars = mergeSidebars(groups, ["sidebars/content.json"]);
    }

    if (scope === "all" || scope === "reference") {
        removeGeneratedGroup(out, "reference");
        const reference = generateReference(out);
        generateCliReference(out);

        groups.reference = reference.map((entry) => entry.outputPath);
        groups.reference.push("reference/cli/");
        groups.sidebars = mergeSidebars(groups, ["sidebars/reference-typescript.json", "sidebars/reference-cli.json"]);
    }

    if (scope === "all" || scope === "readmes") {
        removeGeneratedGroup(out, "readmes");
        const readmes = generateReadmes(out, out.repoReadmesOutputDir);

        groups.readmes = readmes;
        groups.sidebars = mergeSidebars(groups, ["sidebars/readmes.json"]);
    }

    if (scope === "all" || scope === "api") {
        removeGeneratedGroup(out, "api");
        generateAPIV2(out);
        generateLegacyV1(out);

        groups.api = ["reference/api/v2/", "reference/api/legacy/v1/"];
        groups.sidebars = mergeSidebars(groups, ["sidebars/reference-api-v2.json", "sidebars/reference-api-legacy-v1.json"]);
    }

    generatePartials(out);
    generateMetadata(out, groups);
    generateDirectoryIndexes(out);

    console.log(`Generated docs export in ${path.relative(root, out.path) || "."}`);
}

function syncPackageReadmes() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-docs-readme-sync-"));
    const repoReadmesOutputDir = path.join(tempRoot, "repo");
    const out = {
        path: path.join(tempRoot, "docs"),
        source: "sync",
        value: "docs",
        allowUnmarkedExisting: true,
        writeRepoReadmes: true,
        repoReadmesOutputDir
    };

    try {
        generateReadmes(out, repoReadmesOutputDir);
        const updates = [];

        for (const pkgDir of listPackages()) {
            const target = path.join(packagesDir, pkgDir, "README.md");
            const generated = path.join(repoReadmesOutputDir, "packages", pkgDir, "README.md");

            if (!fs.existsSync(target) || !fs.readFileSync(target, "utf8").includes("Generated by scripts/docs.js")) {
                throw new Error(`Refusing to overwrite unowned package README: ${relativeToRoot(target)}`);
            }

            updates.push({ target, content: fs.readFileSync(generated, "utf8") });
        }

        for (const update of updates) writeFile(update.target, update.content);
        console.log(`Synchronized ${updates.length} package READMEs.`);
    } finally {
        removeDir(tempRoot);
    }
}

function generate(customOut, scope = "all") {
    const out = customOut || outputRoot();
    const docsRoot = path.join(root, "docs");
    const legacyRoot = path.join(root, "dist-docs");
    const isDocsRoot = path.resolve(out.path) === docsRoot;

    if (isDocsRoot && fs.existsSync(legacyRoot)) validateOutputRoot(legacyRoot, { requireMarker: true });

    if (isDocsRoot && fs.existsSync(out.path) && !fs.existsSync(markerPath(out.path))) {
        throw new Error(`Refusing to replace unmarked docs output root: ${out.path}. Preserve or migrate its content explicitly before generating.`);
    }

    const result = generateInto(out, scope);
    if (isDocsRoot && fs.existsSync(legacyRoot)) removeDir(legacyRoot);
    return result;
}

function check() {
    validateSource();

    // Validate tables in all docs-source markdown files (not just routed ones)
    for (const file of listFiles(sourceRoot).filter((f) => f.endsWith(".md"))) {
        validateTableColumns(file, fs.readFileSync(file, "utf8"));
    }

    const out = outputRoot();

    if (fs.existsSync(out.path)) {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scramjet-docs-check-"));
        const tempOut = {
            path: tempRoot,
            source: out.source,
            value: out.value,
            resolvedPath: path.relative(root, out.path).split(path.sep).join("/"),
            allowUnmarkedExisting: true,
            writeRepoReadmes: false
        };

        try {
            generate(tempOut);
            const drift = compareDirs(tempRoot, out.path);

            if (drift.length > 0) {
                throw new Error(`Docs output drift detected:\n${drift.map((line) => `- ${line}`).join("\n")}`);
            }
            validateGeneratedLinks(out.path);
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

    if (command === "generate:readmes") {
        generate(undefined, "readmes");
        return;
    }

    if (command === "sync:readmes") {
        syncPackageReadmes();
        return;
    }

    if (command === "generate:api") {
        generate(undefined, "api");
        return;
    }

    if (command === "check") {
        check();
        return;
    }

    throw new Error(`Unknown docs command: ${command}`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.stack || error.message);
        process.exit(1);
    }
}

module.exports = {
    cleanOutput,
    compareDirs,
    generate,
    generateDirectoryIndexes,
    markerPath,
    validateGeneratedLinks,
    validateOutputMarker,
    outputRoot,
    syncPackageReadmes,
    validateOutputRoot,
    validateTableColumns
};
