import { readFileSync } from "fs";
import { lstat, readFile } from "fs/promises";
import { isAbsolute, relative, resolve } from "path";
import { filter as minimatch } from "minimatch";

type PackageJson = {
    main?: unknown;
    engines?: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
    optionalDependencies?: Record<string, unknown>;
};

const supportedEngines = new Set(["node", "bun", "python3"]);

async function ignoredFiles(root: string): Promise<(path: string) => boolean> {
    const ignoreFile = resolve(root, ".siignore");
    let lines: string[] = [];
    try { lines = (await readFile(ignoreFile, "utf8")).split(/\r?\n/); } catch { return () => false; }
    const rules = lines.filter(line => line.trim() && !line.trim().startsWith("#")).map(line => minimatch(line.trim()));
    return (path: string) => rules.some(rule => rule(path, 0, []));
}

function fieldError(field: string, message: string): Error {
    return new Error(`Invalid sequence package ${field}: ${message}`);
}

export async function validateSequencePackage(directory: string): Promise<void> {
    const root = resolve(process.cwd(), directory);
    let packageJson: PackageJson;
    try { packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")); }
    catch { throw fieldError("package.json", "file is missing or is not valid JSON"); }

    if (typeof packageJson.main !== "string" || !packageJson.main) throw fieldError("main", "must be a non-empty string");
    const main = packageJson.main;
    if (isAbsolute(main) || relative(root, resolve(root, main)).startsWith("..")) throw fieldError("main", "must point inside the package");
    const mainPath = resolve(root, main);
    try { if (!(await lstat(mainPath)).isFile()) throw new Error(); } catch { throw fieldError("main", `file does not exist: ${main}`); }

    const engines = packageJson.engines;
    if (!engines || typeof engines !== "object") throw fieldError("engines", "must declare exactly one of node, bun, or python3");
    const declared = Object.keys(engines).filter(key => supportedEngines.has(key));
    if (declared.length !== 1 || Object.keys(engines).length !== 1) throw fieldError("engines", "must declare exactly one supported engine (node, bun, or python3)");

    const isIgnored = await ignoredFiles(root);
    for (const required of ["package.json", main]) {
        if (isIgnored(required) || isIgnored(required.replace(/\\/g, "/"))) throw fieldError(".siignore", `must not ignore required file ${required}`);
    }

    if (declared[0] === "node" || declared[0] === "bun") {
        const dependencies = { ...(packageJson.dependencies || {}), ...(packageJson.optionalDependencies || {}) };
        for (const dependency of Object.keys(dependencies)) {
            const dependencyPath = resolve(root, "node_modules", dependency);
            try { if (!(await lstat(dependencyPath)).isDirectory()) throw new Error(); }
            catch { throw fieldError("dependencies", `declared dependency directory is missing: node_modules/${dependency}`); }
        }
    }
}
