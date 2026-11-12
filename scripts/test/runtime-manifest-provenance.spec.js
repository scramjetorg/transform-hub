const test = require("ava").default;
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
require("tsx/cjs");

const { resolveManifestProofArtifacts } = require("../../bdd/lib/runtime-manifest-artifacts.ts");
const { assertSelectedProvenance } = require("../../bdd/lib/runtime-manifest-node-python.ts");
const { assertManifestProductPath } = require("../../bdd/lib/runtime-manifest-artifacts.ts");
const workspaceRoot = path.resolve(__dirname, "../..");
const bunManifestFixtures = [
	path.join(workspaceRoot, "bdd/data/sequences/bdd-runtime-manifest-bun-producer/index.js"),
	path.join(workspaceRoot, "bdd/data/sequences/bdd-runtime-manifest-bun-consumer/index.js")
];

function createModulePackage(base, mode, name, main, files) {
	const root = path.join(base, mode === "source" ? "packages" : "dist", name);
	fs.mkdirSync(root, { recursive: true });
	fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: `@scramjet/${name}`, main }));
	for (const file of files) {
		const destination = path.join(root, file);
		fs.mkdirSync(path.dirname(destination), { recursive: true });
		fs.writeFileSync(destination, `// ${name}:${file}\n`);
	}
	return { root, files: Object.fromEntries(files.map(file => [file, path.join(root, file)])) };
}

function createPackageFixture(base, mode) {
	const mainNames = { "rest-api2": mode === "source" ? "src/index.ts" : "index.js" };
	const modules = Object.fromEntries(["runner-node", "rest-api2", "api-router"].map(name => {
		const main = mainNames[name] || (mode === "source" ? "src/index.ts" : "index.js");
		const extra = name === "rest-api2" ? mode === "source" ? "src/contracts.ts" : "contracts.js" : null;
		return [name, createModulePackage(base, mode, name, main, [main, ...(extra ? [extra] : [])])];
	}));
	const rest = modules["rest-api2"];
	const cachePaths = [
		rest.files[mode === "source" ? "src/contracts.ts" : "contracts.js"],
		rest.files[mainNames["rest-api2"]],
		modules["api-router"].files[mode === "source" ? "src/index.ts" : "index.js"],
		modules["runner-node"].files[mode === "source" ? "src/index.ts" : "index.js"],
	];
	return { modules, cachePaths };
}

function loadFixtureProvenanceReporter(fixturePath, cachePaths) {
	const fixturePackage = JSON.parse(fs.readFileSync(path.join(path.dirname(fixturePath), "package.json"), "utf8"));
	const cache = Object.fromEntries(cachePaths.map(file => [file, {}]));
	const fixtureRequire = Object.assign(name => {
		if (name === "./package.json") return fixturePackage;
		if (name === "stream") return require("node:stream");
		return require(name);
	}, { cache, resolve: () => { throw new Error("fixture provenance must not manufacture paths with require.resolve"); } });
	const fixtureModule = { exports: {} };
	const sandbox = {
		require: fixtureRequire,
		module: fixtureModule,
		exports: fixtureModule.exports,
		process,
		Buffer,
		console,
		setTimeout,
		clearTimeout,
	};
	const source = `${fs.readFileSync(fixturePath, "utf8")}\n;globalThis.__runtimeManifestProvenance = provenance;`;
	vm.runInNewContext(source, sandbox, { filename: fixturePath });
	return sandbox.__runtimeManifestProvenance;
}

function runFixtureReporters(cachePaths) {
	return bunManifestFixtures.map(fixture => loadFixtureProvenanceReporter(fixture, cachePaths)());
}

function selectedArtifact(mode, base) {
	return {
		mode,
		requestedMode: mode,
		workspaceRoot: base,
		productRoot: path.join(base, mode === "source" ? "packages" : "dist"),
		modules: {}
	};
}

test("validates language-specific source provenance and rejects wrong-language or wrong-tree paths", t => {
	const artifacts = resolveManifestProofArtifacts("source", { workspaceRoot });
	const runnerNodeEntry = path.join(workspaceRoot, "packages/runner-node/src/index.ts");
	const pythonMain = path.join(workspaceRoot, "packages/runner-python/runner_python/__main__.py");
	const pythonSource = path.join(workspaceRoot, "packages/runner-python/src/runner_python");
	const pythonVendored = path.join(workspaceRoot, "packages/runner-python/__pypackages__/verser2_guest_python");
	const nodeProvenance = {
		pid: 10,
		ppid: 1,
		argv1: runnerNodeEntry,
		declaredEngines: { node: ">=22" },
		productModulePaths: {
			restApi2: artifacts.modules.restApi2,
			apiRouter: artifacts.modules.apiRouter,
			runnerNode: runnerNodeEntry
		}
	};
	const pythonProvenance = {
		pid: 11,
		ppid: 1,
		scriptPath: pythonMain,
		productModulePaths: {
			"runner_python.app_context": path.join(pythonSource, "app_context.py"),
			"runner_python.manifest": path.join(pythonSource, "manifest.py"),
			"runner_python.verser2_runtime": path.join(pythonSource, "verser2_runtime.py"),
			verser2_guest_python: path.join(pythonVendored, "__init__.py")
		}
	};

	t.notThrows(() => assertSelectedProvenance(nodeProvenance, artifacts, "node"));
	t.notThrows(() => assertSelectedProvenance(pythonProvenance, artifacts, "python"));
	t.throws(() => assertSelectedProvenance(pythonProvenance, artifacts, "node"), { message: /Node producer did not report restApi2/ });
	t.throws(() => assertSelectedProvenance({
		...pythonProvenance,
		productModulePaths: {
			...pythonProvenance.productModulePaths,
			"runner_python.manifest": path.join(workspaceRoot, "packages/api-router/src/index.ts")
		}
	}, artifacts, "python"), { message: /outside selected source package/ });
});

test("Bun manifest provenance selects each loaded canonical source/dist package main independent of cache order", t => {
	for (const mode of ["source", "built"]) {
		const base = fs.mkdtempSync(path.join(os.tmpdir(), `bun-manifest-${mode}-entry-`));
		t.teardown(() => fs.rmSync(base, { recursive: true, force: true }));
		const { modules, cachePaths } = createPackageFixture(base, mode);
		const artifacts = selectedArtifact(mode, base);
		for (const provenance of runFixtureReporters(cachePaths)) {
			const reported = provenance.productModulePaths.restApi2;
			const expected = modules["rest-api2"].files[mode === "source" ? "src/index.ts" : "index.js"];
			const incidental = modules["rest-api2"].files[mode === "source" ? "src/contracts.ts" : "contracts.js"];
			t.is(reported, fs.realpathSync(expected), `${mode} must report the canonical package main`);
			t.not(reported, fs.realpathSync(incidental), `${mode} must not select an incidental cache member`);
			t.is(assertManifestProductPath(artifacts, "@scramjet/rest-api2", reported), fs.realpathSync(expected));
		}
	}
});

test("Bun manifest provenance returns null when package main is not loaded or its root is ambiguous", t => {
	for (const mode of ["source", "built"]) {
		const base = fs.mkdtempSync(path.join(os.tmpdir(), `bun-manifest-${mode}-missing-entry-`));
		t.teardown(() => fs.rmSync(base, { recursive: true, force: true }));
		const { modules, cachePaths } = createPackageFixture(base, mode);
		const mainPath = modules["rest-api2"].files[mode === "source" ? "src/index.ts" : "index.js"];
		const withoutMain = cachePaths.filter(file => file !== mainPath);
		for (const provenance of runFixtureReporters(withoutMain)) {
			t.is(provenance.productModulePaths.restApi2, null, `${mode} must not fabricate an unloaded package main`);
		}

		const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), `bun-manifest-${mode}-ambiguous-root-`));
		t.teardown(() => fs.rmSync(secondRoot, { recursive: true, force: true }));
		const duplicate = createModulePackage(secondRoot, mode, "rest-api2", mode === "source" ? "src/index.ts" : "index.js", [mode === "source" ? "src/index.ts" : "index.js"]);
		for (const provenance of runFixtureReporters([...cachePaths, duplicate.files[mode === "source" ? "src/index.ts" : "index.js"]])) {
			t.is(provenance.productModulePaths.restApi2, null, `${mode} must reject multiple loaded package roots`);
		}
	}
});

test("canonical provenance entries remain constrained to their selected source/built package roots", t => {
	const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bun-manifest-source-wrong-entry-"));
	const builtRoot = fs.mkdtempSync(path.join(os.tmpdir(), "bun-manifest-built-wrong-entry-"));
	t.teardown(() => {
		fs.rmSync(sourceRoot, { recursive: true, force: true });
		fs.rmSync(builtRoot, { recursive: true, force: true });
	});
	const source = createPackageFixture(sourceRoot, "source");
	const built = createPackageFixture(builtRoot, "built");
	const sourceArtifacts = selectedArtifact("source", sourceRoot);
	const builtArtifacts = selectedArtifact("built", builtRoot);
	const sourceWrongEntry = source.modules["api-router"].files["src/index.ts"];
	const builtWrongEntry = built.modules["api-router"].files["index.js"];
	t.throws(() => assertManifestProductPath(sourceArtifacts, "@scramjet/rest-api2", sourceWrongEntry), { message: /outside selected source package/ });
	t.throws(() => assertManifestProductPath(builtArtifacts, "@scramjet/rest-api2", builtWrongEntry), { message: /outside selected built package/ });
});

test("Bun manifest provenance refuses source/built package mains whose realpaths escape the package root", t => {
	for (const mode of ["source", "built"]) {
		const base = fs.mkdtempSync(path.join(os.tmpdir(), `bun-manifest-${mode}-escaped-main-`));
		t.teardown(() => fs.rmSync(base, { recursive: true, force: true }));
		const { modules, cachePaths } = createPackageFixture(base, mode);
		const mainRelative = mode === "source" ? "src/index.ts" : "index.js";
		const mainPath = modules["rest-api2"].files[mainRelative];
		const outsideRoot = path.join(base, "outside");
		fs.mkdirSync(outsideRoot, { recursive: true });
		const outsideEntry = path.join(outsideRoot, mainRelative.endsWith(".ts") ? "index.ts" : "index.js");
		fs.writeFileSync(outsideEntry, "// escaped canonical main\\n");
		fs.rmSync(mainPath);
		fs.symlinkSync(outsideEntry, mainPath);

		const artifacts = selectedArtifact(mode, base);
		for (const provenance of runFixtureReporters(cachePaths)) {
			t.is(provenance.productModulePaths.restApi2, null, `${mode} provenance must reject an escaped manifest main`);
		}
		t.throws(() => assertManifestProductPath(artifacts, "@scramjet/rest-api2", mainPath), { message: new RegExp(`outside selected ${mode} package`) });
	}
});
