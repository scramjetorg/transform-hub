"use strict";

const test = require("ava");
const { Worker } = require("node:worker_threads");

test("AVA worker runtime accepts inherited execArgv", async (t) => {
	const execArgv = await new Promise((resolve, reject) => {
		const worker = new Worker("require('node:worker_threads').parentPort.postMessage(process.execArgv)", { eval: true });
		worker.once("message", resolve);
		worker.once("error", reject);
	});

	t.false(execArgv.some((arg) => arg.startsWith("--wasm-")));
	if (process.env.SCRAMJET_TEST_PROFILE === "phase-final") {
		t.is(typeof global.gc, "function", "phase-final keeps its strict GC capability");
	}
});
