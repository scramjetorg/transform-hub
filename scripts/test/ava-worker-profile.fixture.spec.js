"use strict";

const test = require("ava").default;
const { Worker } = require("node:worker_threads");

test("AVA worker runtime accepts inherited execArgv", async (t) => {
	const worker = new Worker("require('node:worker_threads').parentPort.postMessage(process.execArgv)", { eval: true });

	let execArgv;

	try {
		execArgv = await new Promise((resolve, reject) => {
			worker.once("message", resolve);
			worker.once("error", reject);
		});
	} finally {
		// Retain the worker reference and stop it on every completion/error
		// path: a live Worker keeps the AVA process's event loop running and
		// the run hangs ("Failed to exit") after the test itself passes.
		await worker.terminate();
	}

	t.false(execArgv.some((arg) => arg.startsWith("--wasm-")));
	if (process.env.SCRAMJET_TEST_PROFILE === "phase-final") {
		t.is(typeof global.gc, "function", "phase-final keeps its strict GC capability");
	}
});
