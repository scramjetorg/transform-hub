/**
 * Regression coverage for the root-owned Docker runner staging boundary.
 */

"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const rootPackage = JSON.parse(readFileSync(resolve(__dirname, "..", "..", "package.json"), "utf8"));

function packageScripts(name) {
	return JSON.parse(readFileSync(resolve(__dirname, "..", "..", "packages", name, "package.json"), "utf8")).scripts;
}

test("root Docker build stages the shared runner closure before serial image build hooks", (t) => {
	const buildDocker = rootPackage.scripts["build:docker"];
	const stageRunner = rootPackage.scripts["build:docker:stage-runner"];

	t.regex(buildDocker, /^\.\/node_modules\/\.bin\/npm run build:docker:stage-runner && SCRAMJET_DOCKER_RUNNER_STAGED=1 /);
	t.true(buildDocker.includes("scripts/run-script.js -w packages -j 1 build:docker"),
		"Docker contexts are created only after each package's prebuild hook completes");
	t.true(stageRunner.startsWith("rm -rf ./dist/docker-runner && "), "staging begins from an empty shared directory");
	t.true(stageRunner.includes("-d packages/runner -o ./dist/docker-runner/"));
	t.true(stageRunner.includes("cp -r packages/runner-python ./dist/docker-runner/runner-python"));
});

test("runner image lifecycle hooks retain standalone staging without racing root builds", (t) => {
	for (const packageName of ["runner", "runner-bun"]) {
		const prebuild = packageScripts(packageName)["prebuild:docker"];

		t.true(prebuild.includes("SCRAMJET_DOCKER_RUNNER_STAGED"), `${packageName} recognizes root staging`);
		t.true(prebuild.includes("scripts/build-all.js"), `${packageName} can stage its own standalone image build`);
	}

	t.true(packageScripts("runner")["prebuild:docker"].includes("cp -r packages/runner-python"));
});
