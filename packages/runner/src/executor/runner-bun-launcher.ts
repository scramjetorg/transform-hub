import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";

export interface ResolvedRunnerBunEntry {
    entry: string;
}

function tryResolvePackageRoot(): string | undefined {
    try {
        const pkgJson = require.resolve("@scramjet/runner-bun/package.json");

        return dirname(pkgJson);
    } catch {
        return undefined;
    }
}

function fallbackPackageRoot(callerDir: string): string | undefined {
    let current = callerDir;

    for (let i = 0; i < 8; i++) {
        const candidate = resolve(current, "..", "runner-bun");

        if (existsSync(resolve(candidate, "package.json"))) {
            return candidate;
        }

        const parent = dirname(current);

        if (parent === current) break;
        current = parent;
    }

    return undefined;
}

export function resolveRunnerBunEntry(callerDir: string): ResolvedRunnerBunEntry {
    const pkgRoot = tryResolvePackageRoot() ?? fallbackPackageRoot(callerDir);

    if (!pkgRoot) {
        throw new Error("runner: cannot resolve @scramjet/runner-bun package root");
    }

    const srcEntry = resolve(pkgRoot, "src/bin/runner-bun.ts");

    try {
        const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf8"));

        if (typeof pkg.main === "string" && pkg.main.includes("src/") && existsSync(srcEntry)) {
            return { entry: srcEntry };
        }
    } catch {
        // Fall through to dist/package/source probing below.
    }

    const distEntry = resolve(pkgRoot, "dist/bin/runner-bun.js");

    if (existsSync(distEntry)) {
        return { entry: distEntry };
    }

    const packagedEntry = resolve(pkgRoot, "bin/runner-bun.js");

    if (existsSync(packagedEntry)) {
        return { entry: packagedEntry };
    }

    if (existsSync(srcEntry)) {
        return { entry: srcEntry };
    }

    throw new Error(
        `runner: cannot resolve runner-bun entry under ${pkgRoot} (looked for dist/bin/runner-bun.js, bin/runner-bun.js, and src/bin/runner-bun.ts)`
    );
}
