#!/usr/bin/env node

"use strict";

const { isMainThread, parentPort, workerData } = require("node:worker_threads");

if (process.env.SCRAMJET_AVA_GUARD === "1") require("./ava-guard.cjs");

const IGNORABLE_RESOURCE_TYPES = new Set(["MessagePort"]);
const IGNORABLE_HANDLE_TYPES = new Set(["MessagePort"]);
const AVA_RESOURCE_BASELINE = new Map([["Timeout", 1]]);
let testFile = workerData?.options?.file || "unknown test file";
let channelResourceBaseline = new Map();
let channelHandleBaseline = new Map();

function describeHandle(handle) {
	const type = handle?.constructor?.name || "Unknown";

	if (type === "Server" && typeof handle.address === "function") {
		const address = handle.address();
		if (address && typeof address === "object") return `${type} (${address.address}:${address.port})`;
	}

	if (type === "Socket") {
		const local = handle.localAddress && handle.localPort ? `${handle.localAddress}:${handle.localPort}` : undefined;
		const remote = handle.remoteAddress && handle.remotePort ? `${handle.remoteAddress}:${handle.remotePort}` : undefined;
		if (local || remote) return `${type} (${local || "unknown"} -> ${remote || "unknown"})`;
	}

	return type;
}

function count(items) {
	return items.reduce((counts, item) => counts.set(item, (counts.get(item) || 0) + 1), new Map());
}

function subtractBaseline(counts, baseline) {
	for (const [type, expected] of baseline) counts.set(type, Math.max(0, (counts.get(type) || 0) - expected));
	return [...counts].flatMap(([type, remaining]) => Array(remaining).fill(type));
}

function snapshotResources() {
	const resources = typeof process.getActiveResourcesInfo === "function"
		? process.getActiveResourcesInfo().filter(type => !IGNORABLE_RESOURCE_TYPES.has(type))
		: [];
	const handles = typeof process._getActiveHandles === "function"
		? process._getActiveHandles().map(describeHandle).filter(type => !IGNORABLE_HANDLE_TYPES.has(type))
		: [];

	return { resources, handles };
}

function findLeakedResources() {
	const { resources, handles } = snapshotResources();
	return {
		resources: subtractBaseline(count(resources), new Map([...AVA_RESOURCE_BASELINE, ...channelResourceBaseline])),
		handles: subtractBaseline(count(handles), channelHandleBaseline)
	};

	return { resources, handles };
}

function reportAndExitIfLeaked() {
	const { resources, handles } = findLeakedResources();

	if (resources.length === 0 && handles.length === 0) return;

	const details = [
		resources.length > 0 && `active resources: ${resources.join(", ")}`,
		handles.length > 0 && `active handles: ${handles.join(", ")}`
	].filter(Boolean).join("; ");
	const message = `[run-ava.js] AVA worker leak after tests completed in ${testFile}: ${details}\n`;

	process.stderr.write(message, () => process.exit(1));
}

function observeAvaWorkerChannel(channel) {
	const onMessage = message => {
		if (message?.ava?.type === "options" && message.ava.options?.file) {
			testFile = message.ava.options.file;
			const snapshot = snapshotResources();
			channelResourceBaseline = count(snapshot.resources);
			channelHandleBaseline = count(snapshot.handles);
		}
		if (message?.ava?.type !== "free-worker") return;

		// The worker is done: stop observing the channel. The leak diagnostic
		// is already scheduled below, and keeping this listener attached can
		// hold the channel open and prevent a clean child-process AVA worker
		// from exiting.
		channel.removeListener("message", onMessage);

		// AVA schedules its own final unhandled-rejection check after this
		// acknowledgement. Let that immediate drain before classifying a
		// resource as leaked, while still checking in the next event-loop turn.
		setImmediate(() => setImmediate(reportAndExitIfLeaked));
	};
	channel.on("message", onMessage);
}

if (!isMainThread && parentPort) observeAvaWorkerChannel(parentPort);
else if (typeof process.send === "function") observeAvaWorkerChannel(process);
