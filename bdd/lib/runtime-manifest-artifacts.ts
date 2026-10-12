import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { resolvePublishedBin, resolvePublishedModule, resolvePublishedPackageRoot } from "./published-artifacts";

export type ManifestProofMode = "source" | "built";
export type ManifestArtifactMode = ManifestProofMode | "tarball";
export type ManifestProofArtifacts = {
    mode: ManifestArtifactMode;
    requestedMode: ManifestProofMode;
    workspaceRoot: string;
    productRoot: string;
    tarballRoot?: string;
    hostCommand: [string, ...string[]];
    modules: { config: string; apiClient: string; restApi2: string; apiRouter: string };
};
export type ManifestProofArtifactOptions = { workspaceRoot?: string; environment?: NodeJS.ProcessEnv };

function assertInside(root: string, file: string, label: string): void {
    const relativePath = relative(root, file);
    if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
        throw new Error(`${label} is outside the selected artifact tree: ${file}`);
    }
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${label} is missing or not a file: ${file}`);
}

function sourceModule(root: string, packageName: string): string {
    return realpathSync(join(root, "packages", packageName, "src", "index.ts"));
}

function inside(parent: string, child: string): boolean {
    const path = relative(resolve(parent), resolve(child));
    return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

/** Resolve the selected root directory for a package in the artifact tree. */
export function manifestPackageRoot(artifacts: ManifestProofArtifacts, packageName: string, consumerPath?: string): string {
    if (artifacts.mode === "tarball") {
        if (!artifacts.tarballRoot) throw new Error("Tarball artifact selection has no prepared root");
        return resolvePublishedPackageRoot(packageName, {
            workspaceRoot: artifacts.workspaceRoot,
            ...(consumerPath ? { consumerPath } : {}),
            environment: { ...process.env, SCRAMJET_TARBALL_BDD_ROOT: artifacts.tarballRoot }
        });
    }
    if (packageName.startsWith("@scramjet/")) {
        const name = packageName.slice("@scramjet/".length);
        const root = realpathSync(join(artifacts.productRoot, name));
        if (!inside(artifacts.productRoot, root)) throw new Error(`Selected ${artifacts.mode} package escapes its product tree: ${packageName}`);
        const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
        if (manifest.name !== packageName) throw new Error(`Selected ${artifacts.mode} package name mismatch: ${packageName}`);
        return root;
    }
    return resolvePublishedPackageRoot(packageName, { workspaceRoot: artifacts.workspaceRoot, ...(consumerPath ? { consumerPath } : {}) });
}

/** Assert that a provenance path belongs to the named package selected for this proof. */
export function assertManifestProductPath(artifacts: ManifestProofArtifacts, packageName: string, file: string, label = packageName, consumerPath?: string): string {
    const packageRoot = manifestPackageRoot(artifacts, packageName, consumerPath);
    const realPath = realpathSync(file);
    if (!inside(packageRoot, realPath) || !statSync(realPath).isFile()) {
        throw new Error(`${label} resolved outside selected ${artifacts.mode} package ${packageName}: ${realPath}`);
    }
    return realPath;
}

export function resolveManifestProofArtifacts(mode: ManifestProofMode, options: ManifestProofArtifactOptions = {}): ManifestProofArtifacts {
    if (mode !== "source" && mode !== "built") throw new Error(`Unsupported runtime-manifest artifact mode: ${String(mode)}`);
    const workspaceRoot = resolve(options.workspaceRoot || process.cwd());
    const environment = options.environment || process.env;
    const requestedTarballRoot = environment.SCRAMJET_TARBALL_BDD_ROOT;
    if (mode === "source" && requestedTarballRoot) {
        throw new Error("Source runtime-manifest proof cannot use a prepared release tarball root");
    }
    const tarballRoot = mode === "built" && requestedTarballRoot ? realpathSync(resolve(requestedTarballRoot)) : undefined;
    const artifactMode: ManifestArtifactMode = tarballRoot ? "tarball" : mode;
    const productRoot = tarballRoot || (mode === "source" ? join(workspaceRoot, "packages") : join(workspaceRoot, "dist"));
    const modules: ManifestProofArtifacts["modules"] = artifactMode === "source"
        ? {
            config: sourceModule(workspaceRoot, "config"),
            apiClient: sourceModule(workspaceRoot, "api-client"),
            restApi2: sourceModule(workspaceRoot, "rest-api2"),
            apiRouter: sourceModule(workspaceRoot, "api-router")
        }
        : {
            config: resolvePublishedModule("@scramjet/config", { workspaceRoot, environment }),
            apiClient: resolvePublishedModule("@scramjet/api-client", { workspaceRoot, environment }),
            restApi2: resolvePublishedModule("@scramjet/rest-api2", { workspaceRoot, environment }),
            apiRouter: resolvePublishedModule("@scramjet/api-router", { workspaceRoot, environment })
        };
    const hostEntry = artifactMode === "source"
        ? realpathSync(join(workspaceRoot, "packages", "sth", "src", "bin", "hub.ts"))
        : resolvePublishedBin("@scramjet/sth", "scramjet-transform-hub", { workspaceRoot, environment });
    const tsxLoader = artifactMode === "source" ? realpathSync(require.resolve("tsx/cjs", { paths: [workspaceRoot] })) : undefined;
    const artifacts: ManifestProofArtifacts = {
        mode: artifactMode,
        requestedMode: mode,
        workspaceRoot,
        productRoot,
        ...(tarballRoot ? { tarballRoot } : {}),
        hostCommand: artifactMode === "source"
            ? [process.execPath, "--require", tsxLoader!, hostEntry]
            : [process.execPath, hostEntry],
        modules: Object.fromEntries(Object.entries(modules).map(([key, value]) => [key, realpathSync(value)])) as ManifestProofArtifacts["modules"]
    };
    for (const [name, packageName] of Object.entries({ config: "@scramjet/config", apiClient: "@scramjet/api-client", restApi2: "@scramjet/rest-api2", apiRouter: "@scramjet/api-router" })) {
        assertManifestProductPath(artifacts, packageName, artifacts.modules[name as keyof typeof artifacts.modules], `${artifactMode} ${name} module`);
    }
    assertManifestProductPath(artifacts, "@scramjet/sth", hostEntry, `${artifactMode} Host entry`);
    if (tsxLoader) assertInside(join(workspaceRoot, "node_modules"), tsxLoader, "workspace tsx loader");
    return artifacts;
}
