import { readFileSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const { context } = require("./release-prerelease-context.js") as {
    context: (options?: { environment?: NodeJS.ProcessEnv; workspaceRoot?: string }) => {
        installDir: string;
        recordPath: string;
    } | null;
};
type ResolverOptions = { environment?: NodeJS.ProcessEnv; workspaceRoot?: string };
const TARBALL_ROOT_ENV = "SCRAMJET_TARBALL_BDD_ROOT";
type BddCliArtifact = { packageDir: string; binRelativePath: string; nodeModulesDir: string; scriptsDir: string };

function inside(parent: string, child: string): boolean {
    const path = relative(resolve(parent), resolve(child));
    return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function packageName(specifier: string): string {
    if (specifier.startsWith("@")) return specifier.split("/", 2).join("/");
    return specifier.split("/", 1)[0];
}

function compiledPackageName(source: string): string {
    return source.startsWith("@") ? source.split("/", 2)[1] : source.split("/", 1)[0];
}

function verified(options: ResolverOptions) {
    return context(options);
}

function resolveBddWorkspaceRoot(cwd = process.cwd()): string {
    // Cucumber is launched from /work/bdd (and from repo/bdd locally), while
    // verified release artifacts are created at the mounted workspace root.
    const current = resolve(cwd);
    return basename(current) === "bdd" ? resolve(current, "..") : current;
}

function bddWorkspaceRoot(options: ResolverOptions): string {
    return options.workspaceRoot ? resolve(options.workspaceRoot) : resolveBddWorkspaceRoot();
}

function readRecord(recordPath: string) {
    const record = JSON.parse(readFileSync(recordPath, "utf8"));
    if (record?.format !== "transform-hub-release-prerelease-bdd-v2" || !Array.isArray(record.packages)) {
        throw new Error("Published-artifact resolution requires a verified prerelease consumption record.");
    }
    return record;
}

function rejectSourceOverride(environment: NodeJS.ProcessEnv) {
    if (environment.SCRAMJET_SPAWN_JS || environment.SCRAMJET_SPAWN_TS) {
        throw new Error("Release-prerelease BDD must use verified published artifacts, not a source override");
    }
}

function tarballRoot(options: ResolverOptions): string | null {
    const value = (options.environment || process.env)[TARBALL_ROOT_ENV];
    return value ? resolve(value) : null;
}

function resolveTarballModule(specifier: string, root: string): string {
    const source = packageName(specifier);
    const packageJson = require.resolve(`${source}/package.json`, { paths: [root] });
    const packageDir = resolve(packageJson, "..");
    const resolved = realpathSync(require.resolve(specifier, { paths: [root] }));
    if (!inside(root, resolved) || !inside(packageDir, resolved)) throw new Error(`Tarball BDD module escapes the isolated execution root: ${specifier}`);
    return resolved;
}

function resolveTarballBin(source: string, binName: string, root: string): string {
    const packageJson = require.resolve(`${source}/package.json`, { paths: [root] });
    const packageDir = resolve(packageJson, "..");
    const configured = JSON.parse(readFileSync(packageJson, "utf8")).bin;
    const relativeBin = typeof configured === "string" ? configured : configured?.[binName];
    if (typeof relativeBin !== "string") throw new Error(`Tarball BDD package does not expose bin ${source}/${binName}`);
    const bin = realpathSync(resolve(packageDir, relativeBin));
    if (!inside(root, bin) || !inside(packageDir, bin) || !statSync(bin).isFile()) throw new Error(`Tarball BDD bin escapes the isolated execution root: ${source}/${binName}`);
    return bin;
}

function resolveCompiledModule(specifier: string, root: string): string {
    const source = packageName(specifier);
    const packageDir = realpathSync(join(root, "dist", compiledPackageName(source)));
    const packageJsonPath = join(packageDir, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const subpath = specifier.slice(source.length).replace(/^\//, "");
    const candidate = subpath ? join(packageDir, subpath) : join(packageDir, packageJson.main || "index.js");
    const resolved = realpathSync(require.resolve(candidate));
    if (!inside(root, resolved) || !inside(packageDir, resolved)) {
        throw new Error(`Normal BDD module escapes its compiled package: ${specifier}`);
    }
    return resolved;
}

function resolveDeclaredBin(source: string, binName: string, root: string): string {
    const packageDir = realpathSync(join(root, "dist", compiledPackageName(source)));
    const packageJsonPath = join(packageDir, "package.json");
    const configured = JSON.parse(readFileSync(packageJsonPath, "utf8")).bin;
    const relativeBin = typeof configured === "string" ? configured : configured?.[binName];
    if (typeof relativeBin !== "string") throw new Error(`Normal BDD package does not expose bin ${source}/${binName}`);
    const bin = realpathSync(resolve(packageDir, relativeBin));
    if (!inside(root, bin) || !inside(packageDir, bin) || !statSync(bin).isFile()) {
        throw new Error(`Normal BDD bin escapes its compiled package: ${source}/${binName}`);
    }
    return bin;
}

function resolveCliArtifact(packageDirInput: string, installRootInput: string, mode: string): BddCliArtifact {
    const installRoot = realpathSync(installRootInput);
    const nodeModulesDir = realpathSync(join(installRoot, "node_modules"));
    const packageDir = realpathSync(packageDirInput);
    if (!inside(installRoot, nodeModulesDir) || !inside(installRoot, packageDir) || (mode !== "Normal" && !inside(nodeModulesDir, packageDir))) {
        throw new Error(`${mode} BDD CLI package escapes its install root`);
    }

    const packageJsonPath = join(packageDir, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.si;
    if (typeof configured !== "string") throw new Error(`${mode} BDD CLI package does not expose bin si`);
    const bin = realpathSync(resolve(packageDir, configured));
    if (!inside(packageDir, bin) || !statSync(bin).isFile()) throw new Error(`${mode} BDD CLI bin escapes its package`);

    const scripts = realpathSync(join(packageDir, "scripts"));
    if (!inside(packageDir, scripts) || !statSync(scripts).isDirectory()) throw new Error(`${mode} BDD CLI scripts escape its package`);
    return { packageDir, binRelativePath: relative(packageDir, bin), nodeModulesDir, scriptsDir: scripts };
}

/** Resolve the CLI package and its completion assets for the active BDD artifact mode. */
export function resolveBddCliArtifact(options: ResolverOptions = {}): BddCliArtifact {
    const environment = options.environment || process.env;
    const isolated = tarballRoot(options);
    if (isolated) {
        rejectSourceOverride(environment);
        const packageJson = require.resolve("@scramjet/cli/package.json", { paths: [isolated] });
        return resolveCliArtifact(resolve(packageJson, ".."), isolated, "Tarball");
    }

    const root = bddWorkspaceRoot(options);
    const release = verified({ ...options, workspaceRoot: root });
    if (release) {
        rejectSourceOverride(environment);
        const record = readRecord(release.recordPath);
        const entry = record.packages.find((candidate: any) => candidate.sourceName === "@scramjet/cli");
        if (!entry) throw new Error("Verified prerelease package is not recorded: @scramjet/cli");
        const installRoot = realpathSync(release.installDir);
        const packageDir = realpathSync(join(installRoot, "node_modules", entry.name));
        return resolveCliArtifact(packageDir, installRoot, "Prerelease");
    }

    const installRoot = realpathSync(join(root, "dist"));
    return resolveCliArtifact(join(installRoot, "cli"), installRoot, "Normal");
}

/** Resolve a package or package subpath, proving the result is in the verified install. */
export function resolvePublishedModule(specifier: string, options: ResolverOptions = {}): string {
    const root = bddWorkspaceRoot(options);
    const environment = options.environment || process.env;
    const isolated = tarballRoot(options);
    if (isolated) { rejectSourceOverride(environment); return resolveTarballModule(specifier, isolated); }
    const release = verified({ ...options, workspaceRoot: root });
    if (!release) return resolveCompiledModule(specifier, root);

    rejectSourceOverride(environment);
    const record = readRecord(release.recordPath);
    const source = packageName(specifier);
    const entry = record.packages.find((candidate: any) => candidate.sourceName === source);
    if (!entry) throw new Error(`Verified prerelease package is not recorded: ${source}`);

    const installModules = realpathSync(join(release.installDir, "node_modules"));
    const packageDir = realpathSync(join(installModules, entry.name));
    const installedSpecifier = specifier.replace(source, entry.name);
    let resolved: string;
    try {
        resolved = require.resolve(installedSpecifier, { paths: [release.installDir] });
    } catch {
        throw new Error(`Unable to resolve verified prerelease module: ${specifier}`);
    }
    const real = realpathSync(resolved);
    if (!inside(installModules, real) || !inside(packageDir, real)) {
        throw new Error(`Verified prerelease module escapes its recorded package: ${specifier}`);
    }
    return real;
}

/** Resolve a package bin, or the canonical STH bin, with the same fail-closed checks. */
export function resolvePublishedBin(source: string, binName: string, options: ResolverOptions = {}): string {
    const root = bddWorkspaceRoot(options);
    const environment = options.environment || process.env;
    const isolated = tarballRoot(options);
    if (isolated) { rejectSourceOverride(environment); return resolveTarballBin(source, binName, isolated); }
    const release = verified({ ...options, workspaceRoot: root });
    if (!release) {
        return resolveDeclaredBin(source, binName, root);
    }

    rejectSourceOverride(environment);
    const record = readRecord(release.recordPath);
    const entry = record.packages.find((candidate: any) => candidate.sourceName === source);
    if (!entry) throw new Error(`Verified prerelease package is not recorded: ${source}`);
    const installModules = realpathSync(join(release.installDir, "node_modules"));
    const packageDir = realpathSync(join(installModules, entry.name));
    if (!inside(installModules, packageDir)) throw new Error(`Verified prerelease package escapes its install root: ${source}`);
    const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.[binName];
    if (typeof configured !== "string") throw new Error(`Verified prerelease package ${source} does not expose bin ${binName}`);
    const bin = resolve(packageDir, configured);
    const real = realpathSync(bin);
    if (!inside(packageDir, real) || !statSync(real).isFile()) throw new Error(`Verified prerelease bin escapes its recorded package: ${source}/${binName}`);
    return real;
}

/** Resolve the BDD CLI executable from the package's declared bin mapping. */
export function resolveWorkspaceCliCommand(options: ResolverOptions = {}): string[] {
    return [resolvePublishedBin("@scramjet/cli", "si", options)];
}

/** Resolve BDD command artifacts: built workspace files normally, verified bins in prerelease mode. */
export function resolveBddBin(source: string, binName: string, options: ResolverOptions = {}): string {
    const isolated = tarballRoot(options);
    if (isolated) {
        rejectSourceOverride(options.environment || process.env);
        return resolveTarballBin(source, binName, isolated);
    }
    const root = resolve(options.workspaceRoot || __dirname, options.workspaceRoot ? "." : "../..");
    return resolvePublishedBin(source, binName, { ...options, workspaceRoot: root });
}

export function createPublishedArtifactResolver(options: ResolverOptions = {}) {
    return {
        resolveModule: (specifier: string) => resolvePublishedModule(specifier, options),
        resolveBin: (source: string, binName: string) => resolvePublishedBin(source, binName, options),
    };
}

/** Explicit names for callers resolving compiled public package artifacts. */
export const resolveBddPackageModule = resolvePublishedModule;
export const resolveBddPackageBin = resolvePublishedBin;

export { resolveBddWorkspaceRoot };
