"use strict";

const test = require("ava");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { typecheckConfigs } = require("../typecheck.js");

test("typecheck discovers release-boundary build configs without relying on a root tsconfig", (t) => {
	const root = mkdtempSync(join(tmpdir(), "transform-hub-typecheck-"));
	t.teardown(() => rmSync(root, { force: true, recursive: true }));

	mkdirSync(join(root, "packages", "included"), { recursive: true });
	mkdirSync(join(root, "packages", "excluded"), { recursive: true });
	writeFileSync(join(root, "package.json"), JSON.stringify({
		workspaces: { release: ["packages/included"] },
	}));
	writeFileSync(join(root, "packages", "included", "tsconfig.build.json"), "{}\n");
	writeFileSync(join(root, "packages", "excluded", "tsconfig.build.json"), "{}\n");

	t.deepEqual(typecheckConfigs(root), [join(root, "packages", "included", "tsconfig.build.json")]);
});
