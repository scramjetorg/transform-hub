import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const { context } = require("./release-prerelease-context.js") as {
    context: (options?: { environment?: NodeJS.ProcessEnv; workspaceRoot?: string }) => { installDir: string; recordPath: string } | null;
};

const TARBALL_ROOT_ENV = "SCRAMJET_TARBALL_BDD_ROOT";
const { INCLUDED_PACKAGES } = require("../../scripts/lib/release-boundary.js") as { INCLUDED_PACKAGES: Set<string> };
type ResolverOptions = { environment?: NodeJS.ProcessEnv; workspaceRoot?: string; consumerPath?: string };
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

function packageSegments(name: string): string[] {
    const parts = name.split("/");
    if (!name || name.includes("\\") || name.includes("..") || parts.some(part => !part || part === ".") || (name.startsWith("@") && parts.length !== 2) || (!name.startsWith("@") && parts.length !== 1)) {
        throw new Error(`Invalid package name for selected artifacts: ${name}`);
    }
    return parts;
}

function installedPackageRoot(name: string, root: string): string {
    const modulesRoot = realpathSync(join(root, "node_modules"));
    const packageRoot = realpathSync(join(modulesRoot, ...packageSegments(name)));
    if (!inside(modulesRoot, packageRoot)) throw new Error(`Installed package escapes its node_modules root: ${name}`);
    const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    if (packageJson.name !== name) throw new Error(`Installed package name mismatch for ${name}: ${packageJson.name}`);
    return packageRoot;
}

function packageRootResolvedFromConsumer(name: string, consumerPath: string, installRoot: string): string {
    const selectedRoot = realpathSync(installRoot);
    const realConsumer = realpathSync(consumerPath);
    if (!inside(selectedRoot, realConsumer)) throw new Error(`Selected dependency consumer is outside its install root: ${consumerPath}`);
    const resolvedEntry = realpathSync(createRequire(realConsumer).resolve(name));
    if (!inside(selectedRoot, resolvedEntry)) throw new Error(`Resolved dependency escapes its selected install root: ${name}`);
    let directory = dirname(resolvedEntry);
    while (inside(selectedRoot, directory)) {
        const manifestPath = join(directory, "package.json");
        if (existsSync(manifestPath)) {
            const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
            if (manifest.name === name) {
                const packageRoot = realpathSync(directory);
                if (!inside(selectedRoot, packageRoot)) throw new Error(`Resolved dependency package escapes its selected install root: ${name}`);
                if (INCLUDED_PACKAGES.has(name)) {
                    const identity = preparedTarballIdentity(name, selectedRoot);
                    if (manifest.version !== identity.version || manifest.scramjet?.release?.identityDigest !== identity.identityDigest || manifest.scramjet?.release?.packageChecksum !== identity.packageChecksum) {
                        throw new Error(`Installed tarball package identity mismatch for ${name}`);
                    }
                }
                return packageRoot;
            }
        }
        const parent = dirname(directory);
        if (parent === directory) break;
        directory = parent;
    }
    throw new Error(`Resolved dependency has no matching package identity inside its selected install root: ${name}`);
}

function preparedTarballIdentity(name: string, root: string): { version: string; identityDigest: string; packageChecksum: string } {
    const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
    const record = JSON.parse(readFileSync(join(root, "release-tarball-bdd-record.json"), "utf8"));
    if (record.format !== "transform-hub-release-tarball-bdd-v1") throw new Error("Prepared tarball record format is unsupported");
    const uniqueBy = <T>(items: T[], key: (item: T) => string, label: string): Map<string, T> => {
        if (!Array.isArray(items) || items.length !== INCLUDED_PACKAGES.size) throw new Error(`Prepared tarball ${label} does not match the release boundary size`);
        const values = new Map<string, T>();
        for (const item of items) {
            const itemName = key(item);
            if (!INCLUDED_PACKAGES.has(itemName) || values.has(itemName)) throw new Error(`Prepared tarball ${label} has an extra or duplicate package: ${itemName}`);
            values.set(itemName, item);
        }
        for (const included of INCLUDED_PACKAGES) if (!values.has(included)) throw new Error(`Prepared tarball ${label} is missing ${included}`);
        return values;
    };
    if (typeof manifest.version !== "string" || typeof manifest.identityDigest !== "string") throw new Error("Prepared tarball manifest identity is incomplete");
    const packages = uniqueBy<any>(manifest.packages, item => item.name, "manifest package list");
    const assets = uniqueBy<any>(manifest.tarballs, item => item.package, "manifest tarball list");
    const records = uniqueBy<any>(record.packages, item => item.sourceName, "install record");
    const packageEntry = packages.get(name) as any;
    const asset = assets.get(name) as any;
    const entry = records.get(name) as any;
    if (!packageEntry || !asset || !entry || packageEntry.version !== manifest.version || asset.version !== manifest.version) {
        throw new Error(`Prepared tarball manifest identity does not match ${name}`);
    }
    if (entry.name !== name || entry.tarball !== asset.name || entry.sha256 !== asset.sha256 || packageEntry.packageChecksum !== asset.packageChecksum) {
        throw new Error(`Prepared tarball record does not match manifest associations for ${name}`);
    }
    return { version: packageEntry.version, identityDigest: manifest.identityDigest, packageChecksum: packageEntry.packageChecksum };
}

function tarballPackageRoot(name: string, root: string): string {
    if (INCLUDED_PACKAGES.has(name)) {
        const identity = preparedTarballIdentity(name, root);
        const packageRoot = installedPackageRoot(name, root);
        const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
        if (packageJson.version !== identity.version || packageJson.scramjet?.release?.identityDigest !== identity.identityDigest || packageJson.scramjet?.release?.packageChecksum !== identity.packageChecksum) {
            throw new Error(`Installed tarball package identity mismatch for ${name}`);
        }
        return packageRoot;
    }
    return installedPackageRoot(name, root);
}

function resolveTarballModule(specifier: string, root: string): string {
    const source = packageName(specifier);
    const packageDir = tarballPackageRoot(source, root);
    const resolved = realpathSync(require.resolve(specifier, { paths: [root] }));
    if (!inside(root, resolved) || !inside(packageDir, resolved)) throw new Error(`Tarball BDD module escapes the isolated execution root: ${specifier}`);
    return resolved;
}
function resolveTarballBin(source: string, binName: string, root: string): string {
    const packageDir = tarballPackageRoot(source, root);
    const packageJsonPath = join(packageDir, "package.json");
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
    if (isolated) { rejectSourceOverride(environment); return resolveCliArtifact(resolvePublishedPackageRoot("@scramjet/cli", options), isolated, "Tarball"); }
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

export function resolvePublishedPackageRoot(specifier: string, options: ResolverOptions = {}): string {
    const source = packageName(specifier);
    const environment = options.environment || process.env;
    const isolated = tarballRoot(options);
    if (options.consumerPath) {
        if (isolated) rejectSourceOverride(environment);
        return packageRootResolvedFromConsumer(source, options.consumerPath, isolated || bddWorkspaceRoot(options));
    }
    if (isolated) {
        rejectSourceOverride(environment);
        return tarballPackageRoot(source, isolated);
    }

    const root = bddWorkspaceRoot(options);
    const release = context({ ...options, workspaceRoot: root });
    if (release) {
        rejectSourceOverride(environment);
        const record = JSON.parse(readFileSync(release.recordPath, "utf8"));
        const entry = record.packages.find((candidate: any) => candidate.sourceName === source);
        if (!entry) throw new Error(`Verified prerelease package is not recorded: ${source}`);
        const packageRoot = installedPackageRoot(entry.name, release.installDir);
        const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
        if (packageJson.version !== entry.version) throw new Error(`Verified prerelease package version mismatch: ${source}`);
        return packageRoot;
    }

    if (INCLUDED_PACKAGES.has(source)) {
        const packageRoot = realpathSync(join(root, "dist", compiledPackageName(source)));
        const packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
        if (packageJson.name !== source) throw new Error(`Compiled package name mismatch for ${source}`);
        return packageRoot;
    }
    return installedPackageRoot(source, root);
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
