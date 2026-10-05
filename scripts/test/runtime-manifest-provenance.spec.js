const test = require("ava").default;
require("tsx/cjs");

const { resolveManifestProofArtifacts } = require("../../bdd/lib/runtime-manifest-artifacts.ts");
const { assertSelectedProvenance } = require("../../bdd/lib/runtime-manifest-node-python.ts");

test("validates language-specific source provenance and rejects wrong-language or wrong-tree paths", t => {
	const artifacts = resolveManifestProofArtifacts("source");
	const nodeProvenance = {
		pid: 10,
		ppid: 1,
		argv1: "/workspace/packages/runner-node/src/index.js",
		declaredEngines: { node: ">=22" },
		productModulePaths: {
			restApi2: artifacts.modules.restApi2,
			apiRouter: artifacts.modules.apiRouter,
			runnerNode: "/workspace/packages/runner-node/src/index.js"
		}
	};
	const pythonProvenance = {
		pid: 11,
		ppid: 1,
		scriptPath: "/workspace/packages/runner-python/src/runner_python/main.py",
		productModulePaths: {
			"runner_python.app_context": "/workspace/packages/runner-python/src/runner_python/app_context.py",
			"runner_python.manifest": "/workspace/packages/runner-python/src/runner_python/manifest.py",
			"runner_python.verser2_runtime": "/workspace/packages/runner-python/src/runner_python/verser2_runtime.py",
			verser2_guest_python: "/workspace/packages/runner-python/__pypackages__/verser2_guest_python/__init__.py"
		}
	};

	t.notThrows(() => assertSelectedProvenance(nodeProvenance, artifacts, "node"));
	t.notThrows(() => assertSelectedProvenance(pythonProvenance, artifacts, "python"));
	t.throws(() => assertSelectedProvenance(pythonProvenance, artifacts, "node"), { message: /Node producer did not report restApi2/ });
	t.throws(() => assertSelectedProvenance({
		...pythonProvenance,
		productModulePaths: {
			...pythonProvenance.productModulePaths,
			"runner_python.manifest": "/workspace/dist/runner-python/runner_python/manifest.py"
		}
	}, artifacts, "python"), { message: /not loaded from selected source runner tree/ });
});
