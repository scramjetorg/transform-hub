import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";

const { context } = require("./release-prerelease-context.js") as {
    context: (options?: { environment?: NodeJS.ProcessEnv; workspaceRoot?: string }) => {
        installDir: string;
        recordPath: string;
    } | null;
};
const { resolveSthBin } = require("../../scripts/lib/sth-bin.js") as {
    resolveSthBin: (options?: { cwd?: string }) => { binPath: string };
};

type ResolverOptions = { environment?: NodeJS.ProcessEnv; workspaceRoot?: string };

function inside(parent: string, child: string): boolean {
    const path = relative(resolve(parent), resolve(child));
    return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function packageName(specifier: string): string {
    if (specifier.startsWith("@")) return specifier.split("/", 2).join("/");
    return specifier.split("/", 1)[0];
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

/** Resolve a package or package subpath, proving the result is in the verified install. */
export function resolvePublishedModule(specifier: string, options: ResolverOptions = {}): string {
    const root = bddWorkspaceRoot(options);
    const environment = options.environment || process.env;
    const release = verified({ ...options, workspaceRoot: root });
    if (!release) return require.resolve(specifier, { paths: [root] });

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
    const release = verified({ ...options, workspaceRoot: root });
    if (!release) {
        if (binName === "scramjet-transform-hub" && source === "@scramjet/sth") return resolveSthBin({ cwd: root }).binPath;
        const candidate = join(root, "node_modules", ".bin", binName);
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
        const packageJsonPath = require.resolve(`${source}/package.json`, { paths: [root] });
        const packageDir = resolve(packageJsonPath, "..");
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
        const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.[binName];
        if (typeof configured !== "string") throw new Error(`Unable to resolve bin ${binName}`);
        const bin = resolve(packageDir, configured);
        if (!existsSync(bin) || !statSync(bin).isFile()) throw new Error(`Unable to resolve bin ${binName}`);
        return bin;
    }

    rejectSourceOverride(environment);
    const record = readRecord(release.recordPath);
    const entry = record.packages.find((candidate: any) => candidate.sourceName === source);
    if (!entry) throw new Error(`Verified prerelease package is not recorded: ${source}`);
    const installModules = realpathSync(join(release.installDir, "node_modules"));
    const packageDir = realpathSync(join(installModules, entry.name));
    const packageJson = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
    const configured = typeof packageJson.bin === "string" ? packageJson.bin : packageJson.bin?.[binName];
    if (typeof configured !== "string") throw new Error(`Verified prerelease package ${source} does not expose bin ${binName}`);
    const bin = resolve(packageDir, configured);
    const real = realpathSync(bin);
    if (!inside(packageDir, real) || !statSync(real).isFile()) throw new Error(`Verified prerelease bin escapes its recorded package: ${source}/${binName}`);
    return real;
}

/** Preserve the normal BDD CLI launcher while keeping its artifact path here. */
export function resolveWorkspaceCliCommand(): string[] {
    return ["node", "../dist/cli/bin"];
}

/** Resolve BDD command artifacts: built workspace files normally, verified bins in prerelease mode. */
export function resolveBddBin(source: string, binName: string, options: ResolverOptions = {}): string {
    const root = resolve(options.workspaceRoot || __dirname, options.workspaceRoot ? "." : "../..");
    if (verified({ ...options, workspaceRoot: root })) return resolvePublishedBin(source, binName, { ...options, workspaceRoot: root });

    const packageDirectory = source === "@scramjet/sth" ? "sth" : source === "@scramjet/manager" ? "manager" : undefined;
    if (!packageDirectory) throw new Error(`No normal BDD binary mapping exists for ${source}`);
    const bin = join(root, "dist", packageDirectory, "bin", binName === "sth-csr-enrollment" || binName === "manager-csr-enrollment" ? "csr-enrollment.js" : binName);
    if (!existsSync(bin) || !statSync(bin).isFile()) throw new Error(`Built BDD binary is unavailable: ${bin}`);
    return bin;
}

export function createPublishedArtifactResolver(options: ResolverOptions = {}) {
    return {
        resolveModule: (specifier: string) => resolvePublishedModule(specifier, options),
        resolveBin: (source: string, binName: string) => resolvePublishedBin(source, binName, options),
    };
}

export { resolveBddWorkspaceRoot };
