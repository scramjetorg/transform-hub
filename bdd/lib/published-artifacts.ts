import { readFileSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const { context } = require("./release-prerelease-context.js") as {
    context: (options?: { environment?: NodeJS.ProcessEnv; workspaceRoot?: string }) => { installDir: string; recordPath: string } | null;
};

const TARBALL_ROOT_ENV = "SCRAMJET_TARBALL_BDD_ROOT";
type ResolverOptions = { environment?: NodeJS.ProcessEnv; workspaceRoot?: string };
type BddCliArtifact = { packageDir: string; binRelativePath: string; nodeModulesDir: string; scriptsDir: string };

function inside(parent: string, child: string): boolean {
    const path = relative(resolve(parent), resolve(child));
    return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}
function packageName(specifier: string): string { return specifier.startsWith("@") ? specifier.split("/", 2).join("/") : specifier.split("/", 1)[0]; }
function compiledPackageName(source: string): string { return source.startsWith("@") ? source.split("/", 2)[1] : source.split("/", 1)[0]; }
function resolveBddWorkspaceRoot(cwd = process.cwd()): string { const current = resolve(cwd); return basename(current) === "bdd" ? resolve(current, "..") : current; }
function bddWorkspaceRoot(options: ResolverOptions): string { return options.workspaceRoot ? resolve(options.workspaceRoot) : resolveBddWorkspaceRoot(); }
function tarballRoot(options: ResolverOptions): string | null {
    const value = (options.environment || process.env)[TARBALL_ROOT_ENV];
    return value ? resolve(value) : null;
}
function rejectSourceOverride(environment: NodeJS.ProcessEnv) {
    if (environment.SCRAMJET_SPAWN_JS || environment.SCRAMJET_SPAWN_TS || environment.NODE_PATH)
        throw new Error("Tarball BDD must use installed tarballs, not source or NODE_PATH overrides");
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
    const packageJsonPath = require.resolve(`${source}/package.json`, { paths: [root] });
    const packageDir = resolve(packageJsonPath, "..");
    const configured = JSON.parse(readFileSync(packageJsonPath, "utf8")).bin;
    const relativeBin = typeof configured === "string" ? configured : configured?.[binName];
    if (typeof relativeBin !== "string") throw new Error(`Tarball BDD package does not expose bin ${source}/${binName}`);
    const bin = realpathSync(resolve(packageDir, relativeBin));
    if (!inside(root, bin) || !inside(packageDir, bin) || !statSync(bin).isFile()) throw new Error(`Tarball BDD bin escapes the isolated execution root: ${source}/${binName}`);
    return bin;
}
function resolveCompiledModule(specifier: string, root: string): string {
    const source = packageName(specifier);
    const packageDir = realpathSync(join(root, "dist", compiledPackageName(source)));
    const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    const subpath = specifier.slice(source.length).replace(/^\//, "");
    const resolved = realpathSync(require.resolve(subpath ? join(packageDir, subpath) : join(packageDir, packageJson.main || "index.js")));
    if (!inside(root, resolved) || !inside(packageDir, resolved)) throw new Error(`Normal BDD module escapes its compiled package: ${specifier}`);
    return resolved;
}
function resolveDeclaredBin(source: string, binName: string, root: string): string {
    const packageDir = realpathSync(join(root, "dist", compiledPackageName(source)));
    const packageJsonPath = join(packageDir, "package.json");
    const configured = JSON.parse(readFileSync(packageJsonPath, "utf8")).bin;
    const relativeBin = typeof configured === "string" ? configured : configured?.[binName];
    if (typeof relativeBin !== "string") throw new Error(`Normal BDD package does not expose bin ${source}/${binName}`);
    const bin = realpathSync(resolve(packageDir, relativeBin));
    if (!inside(root, bin) || !inside(packageDir, bin) || !statSync(bin).isFile()) throw new Error(`Normal BDD bin escapes its compiled package: ${source}/${binName}`);
    return bin;
}
function resolveCliArtifact(packageDirInput: string, installRootInput: string, mode: string): BddCliArtifact {
    const installRoot = realpathSync(installRootInput); const nodeModulesDir = realpathSync(join(installRoot, "node_modules")); const packageDir = realpathSync(packageDirInput);
    if (!inside(installRoot, nodeModulesDir) || !inside(installRoot, packageDir) || (mode !== "Normal" && !inside(nodeModulesDir, packageDir))) throw new Error(`${mode} BDD CLI package escapes its install root`);
    const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.si;
    if (typeof configured !== "string") throw new Error(`${mode} BDD CLI package does not expose bin si`);
    const bin = realpathSync(resolve(packageDir, configured)); const scripts = realpathSync(join(packageDir, "scripts"));
    if (!inside(packageDir, bin) || !statSync(bin).isFile() || !inside(packageDir, scripts) || !statSync(scripts).isDirectory()) throw new Error(`${mode} BDD CLI artifact escapes its package`);
    return { packageDir, binRelativePath: relative(packageDir, bin), nodeModulesDir, scriptsDir: scripts };
}

export function resolveBddCliArtifact(options: ResolverOptions = {}): BddCliArtifact {
    const environment = options.environment || process.env; const isolated = tarballRoot(options);
    if (isolated) { rejectSourceOverride(environment); const packageJson = require.resolve("@scramjet/cli/package.json", { paths: [isolated] }); return resolveCliArtifact(resolve(packageJson, ".."), isolated, "Tarball"); }
    const root = bddWorkspaceRoot(options); const release = context({ ...options, workspaceRoot: root });
    if (release) { rejectSourceOverride(environment); const record = JSON.parse(readFileSync(release.recordPath, "utf8")); const entry = record.packages.find((candidate: any) => candidate.sourceName === "@scramjet/cli"); if (!entry) throw new Error("Verified prerelease package is not recorded: @scramjet/cli"); return resolveCliArtifact(join(release.installDir, "node_modules", entry.name), release.installDir, "Prerelease"); }
    return resolveCliArtifact(join(root, "dist", "cli"), join(root, "dist"), "Normal");
}
export function resolvePublishedModule(specifier: string, options: ResolverOptions = {}): string {
    const environment = options.environment || process.env; const isolated = tarballRoot(options);
    if (isolated) { rejectSourceOverride(environment); return resolveTarballModule(specifier, isolated); }
    const root = bddWorkspaceRoot(options); const release = context({ ...options, workspaceRoot: root });
    if (!release) return resolveCompiledModule(specifier, root);
    rejectSourceOverride(environment); const record = JSON.parse(readFileSync(release.recordPath, "utf8")); const source = packageName(specifier); const entry = record.packages.find((candidate: any) => candidate.sourceName === source); if (!entry) throw new Error(`Verified prerelease package is not recorded: ${source}`);
    const modules = realpathSync(join(release.installDir, "node_modules")); const packageDir = realpathSync(join(modules, entry.name)); const resolved = realpathSync(require.resolve(specifier.replace(source, entry.name), { paths: [release.installDir] }));
    if (!inside(modules, resolved) || !inside(packageDir, resolved)) throw new Error(`Verified prerelease module escapes its recorded package: ${specifier}`); return resolved;
}
export function resolvePublishedBin(source: string, binName: string, options: ResolverOptions = {}): string {
    const environment = options.environment || process.env; const isolated = tarballRoot(options); if (isolated) { rejectSourceOverride(environment); return resolveTarballBin(source, binName, isolated); }
    const root = bddWorkspaceRoot(options); const release = context({ ...options, workspaceRoot: root }); if (!release) return resolveDeclaredBin(source, binName, root);
    rejectSourceOverride(environment); const record = JSON.parse(readFileSync(release.recordPath, "utf8")); const entry = record.packages.find((candidate: any) => candidate.sourceName === source); if (!entry) throw new Error(`Verified prerelease package is not recorded: ${source}`);
    const packageDir = realpathSync(join(release.installDir, "node_modules", entry.name)); const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")); const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.[binName]; if (typeof configured !== "string") throw new Error(`Verified prerelease package ${source} does not expose bin ${binName}`); const bin = realpathSync(resolve(packageDir, configured)); if (!inside(packageDir, bin) || !statSync(bin).isFile()) throw new Error(`Verified prerelease bin escapes its recorded package: ${source}/${binName}`); return bin;
}
export function resolveWorkspaceCliCommand(options: ResolverOptions = {}): string[] { return [resolvePublishedBin("@scramjet/cli", "si", options)]; }
export function resolveBddBin(source: string, binName: string, options: ResolverOptions = {}): string { const isolated = tarballRoot(options); if (isolated) { rejectSourceOverride(options.environment || process.env); return resolveTarballBin(source, binName, isolated); } return resolvePublishedBin(source, binName, { ...options, workspaceRoot: resolve(options.workspaceRoot || __dirname, options.workspaceRoot ? "." : "../..") }); }
export function createPublishedArtifactResolver(options: ResolverOptions = {}) { return { resolveModule: (specifier: string) => resolvePublishedModule(specifier, options), resolveBin: (source: string, binName: string) => resolvePublishedBin(source, binName, options) }; }
export const resolveBddPackageModule = resolvePublishedModule;
export const resolveBddPackageBin = resolvePublishedBin;
export { resolveBddWorkspaceRoot };
