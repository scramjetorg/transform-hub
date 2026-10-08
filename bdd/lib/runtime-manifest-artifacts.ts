import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { resolvePublishedBin, resolvePublishedModule } from "./published-artifacts";

export type ManifestProofMode = "source" | "built";
export type ManifestProofArtifacts = {
    mode: ManifestProofMode;
    workspaceRoot: string;
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

export function resolveManifestProofArtifacts(mode: ManifestProofMode, options: ManifestProofArtifactOptions = {}): ManifestProofArtifacts {
    if (mode !== "source" && mode !== "built") throw new Error(`Unsupported runtime-manifest artifact mode: ${String(mode)}`);
    const workspaceRoot = resolve(options.workspaceRoot || process.cwd());
    const environment = options.environment || process.env;
    const modules: ManifestProofArtifacts["modules"] = mode === "source"
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
    const hostEntry = mode === "source"
        ? realpathSync(join(workspaceRoot, "packages", "sth", "src", "bin", "hub.ts"))
        : resolvePublishedBin("@scramjet/sth", "scramjet-transform-hub", { workspaceRoot, environment });
    const tsxLoader = mode === "source" ? realpathSync(require.resolve("tsx/cjs", { paths: [workspaceRoot] })) : undefined;
    const tree = mode === "source" ? join(workspaceRoot, "packages") : join(workspaceRoot, "dist");
    for (const [name, path] of Object.entries(modules)) assertInside(tree, realpathSync(path), `${mode} ${name} module`);
    assertInside(tree, hostEntry, `${mode} Host entry`);
    if (tsxLoader) assertInside(join(workspaceRoot, "node_modules"), tsxLoader, "workspace tsx loader");
    return {
        mode,
        workspaceRoot,
        hostCommand: mode === "source"
            ? [process.execPath, "--require", tsxLoader!, hostEntry]
            : [process.execPath, hostEntry],
        modules: Object.fromEntries(Object.entries(modules).map(([key, value]) => [key, realpathSync(value)])) as ManifestProofArtifacts["modules"]
    };
}
