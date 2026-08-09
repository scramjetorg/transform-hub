import test from "ava";

/**
 * Phase 3 green-state acceptance tests for the typings split.
 *
 * These tests verify that the split packages now exist and can be imported.
 * They replace the Phase 1 red-state tests that expected MODULE_NOT_FOUND.
 */

const SPLIT_PACKAGES = [
    "@scramjet/runtime-types",
    "@scramjet/sequence-types",
    "@scramjet/api-types",
] as const;

for (const pkg of SPLIT_PACKAGES) {
    test(`dynamic import of ${pkg} resolves successfully (green state)`, async (t) => {
        const mod = await import(pkg);

        t.truthy(mod, `${pkg} resolved and exported members`);
        t.true(typeof mod === "object", `${pkg} exports an object`);
    });
}

/**
 * Verify that all three split packages resolve through the workspace.
 */
test("all three split packages are resolvable in Phase 3 (green state)", (t) => {
    const failures: Array<{ pkg: string; error: string }> = [];

    for (const pkg of SPLIT_PACKAGES) {
        try {
            const resolved = require.resolve(pkg, { paths: [__dirname] });

            t.truthy(resolved, `${pkg} resolved to: ${resolved}`);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);

            failures.push({ pkg, error: message });
        }
    }

    if (failures.length > 0) {
        t.fail(
            `Expected all split packages to resolve, but:\n${
                failures.map((f) => `  ${f.pkg}: ${f.error}`).join("\n")
            }`
        );
    }
});

/**
 * Verify runtime-types does not have forbidden dependencies by inspecting
 * its package.json (the correct approach in a hoisted monorepo where
 * require.resolve finds packages through hoisting).
 */
test("dependency-boundary: runtime-types has no forbidden dependencies", (t) => {
    const FORBIDDEN = [
        "@scramjet/rest-api2",
        "@scramjet/api-types",
        "@scramjet/sequence-types",
        "@scramjet/types",
    ];

    const path = require("path");
    const fs = require("fs");
    // Resolve runtime-types src/index.ts, then go up 2 levels to the package root
    const rtIndexPath = require.resolve("@scramjet/runtime-types");
    const rtPkgDir = path.dirname(path.dirname(rtIndexPath));
    const rtPkg = JSON.parse(fs.readFileSync(path.join(rtPkgDir, "package.json"), "utf-8"));
    const allDeps = { ...rtPkg.dependencies, ...rtPkg.devDependencies };
    const violations = FORBIDDEN.filter((dep) => dep in allDeps);

    if (violations.length > 0) {
        t.fail(
            `runtime-types package.json lists forbidden dependencies: ${violations.join(", ")}`
        );
    } else {
        t.pass("runtime-types has no forbidden dependencies");
    }
});
