const test = require("ava").default;
const path = require("node:path");
require("tsx/cjs");

const { resolveManifestProofArtifacts } = require("../../bdd/lib/runtime-manifest-artifacts.ts");
const { assertSelectedProvenance } = require("../../bdd/lib/runtime-manifest-node-python.ts");
const workspaceRoot = path.resolve(__dirname, "../..");

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
