import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";

/**
 * Resolves the runner-node entry script path. Prefers the compiled
 * `dist/bin/runner-node.js` shipped alongside the published package; falls
 * back to the in-tree `src/bin/runner-node.ts` for source-tree development.
 *
 * Returns both the absolute entry path and a flag describing whether the
 * caller needs to run it via `ts-node/register` (true for the `.ts` source
 * fallback, false for the compiled JS entry).
 */
export interface ResolvedRunnerNodeEntry {
    entry: string;
    needsTsNode: boolean;
}

interface RunnerNodePackageJson {
    main?: string;
    bin?: string | Record<string, string>;
}

function tryResolvePackageRoot(): string | undefined {
    try {
        // require.resolve respects the workspace symlink under
        // node_modules/@scramjet/runner-node and also a regular install.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkgJson = require.resolve("@scramjet/runner-node/package.json");

        return dirname(pkgJson);
    } catch {
        return undefined;
    }
}

function fallbackPackageRoot(callerDir: string): string | undefined {
    // Walk up from caller location looking for a sibling `runner-node`
    // package directory inside the same packages/ workspace folder. This
    // covers source-tree/ts-node development where module resolution does
    // not include the workspace package.
    let current = callerDir;

    for (let i = 0; i < 8; i++) {
        const candidate = resolve(current, "..", "runner-node");

        if (existsSync(resolve(candidate, "package.json"))) {
            return candidate;
        }

        const parent = dirname(current);

        if (parent === current) break;
        current = parent;
    }

    return undefined;
}

export function resolveRunnerNodeEntry(callerDir: string): ResolvedRunnerNodeEntry {
    const pkgRoot = tryResolvePackageRoot() ?? fallbackPackageRoot(callerDir);

    if (!pkgRoot) {
        throw new Error("runner: cannot resolve @scramjet/runner-node package root");
    }

    const srcEntry = resolve(pkgRoot, "src/bin/runner-node.ts");
    let pkg: RunnerNodePackageJson | undefined;

    try {
        pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));

        if (typeof pkg?.main === "string" && pkg.main.includes("src/") && existsSync(srcEntry)) {
            return { entry: srcEntry, needsTsNode: true };
        }
    } catch {
        // Fall through to the bin/dist/source probing below.
    }

    const packageBin = typeof pkg?.bin === "string" ? pkg.bin : pkg?.bin?.["runner-node"];

    if (packageBin) {
        const packageBinEntry = resolve(pkgRoot, packageBin);

        if (existsSync(packageBinEntry)) {
            return { entry: packageBinEntry, needsTsNode: false };
        }
    }

    const packagedEntry = resolve(pkgRoot, "bin/runner-node.js");

    if (existsSync(packagedEntry)) {
        return { entry: packagedEntry, needsTsNode: false };
    }

    const distEntry = resolve(pkgRoot, "dist/bin/runner-node.js");

    if (existsSync(distEntry)) {
        return { entry: distEntry, needsTsNode: false };
    }

    if (existsSync(srcEntry)) {
        return { entry: srcEntry, needsTsNode: true };
    }

    throw new Error(
        `runner: cannot resolve runner-node entry under ${pkgRoot} (looked for bin.runner-node, bin/runner-node.js, dist/bin/runner-node.js, and src/bin/runner-node.ts)`
    );
}
