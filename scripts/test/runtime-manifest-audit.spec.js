const test = require("ava").default;
const http = require("http");
require("tsx/cjs");
const { openManifestAuditCapture } = require("../../bdd/lib/runtime-manifest-audit.ts");

async function withServer(t, handler) {
	const server = http.createServer(handler);
	await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
	t.teardown(() => new Promise(resolve => server.close(resolve)));
	return `http://127.0.0.1:${server.address().port}`;
}

test("captures split UTF-8 NDJSON records and resolves past and future waits", async t => {
	const base = await withServer(t, (_request, response) => {
		response.writeHead(200, { "content-type": "application/x-ndjson" });
		response.write('{"opCode":13030,"name":"café",');
		setImmediate(() => response.end('"revision":2}\n{"opCode":12}\n'));
	});
	const capture = await openManifestAuditCapture(base);
	const later = await capture.waitFor(record => record.revision === 2);
	t.deepEqual(later, { opCode: 13030, name: "café", revision: 2 });
	t.is(await capture.waitFor(record => record.name === "café"), later);
	await capture.close();
});

test("surfaces unsuccessful HTTP status", async t => {
	const base = await withServer(t, (_request, response) => response.writeHead(503).end());
	await t.throwsAsync(openManifestAuditCapture(base), { message: /HTTP 503/ });
});

test("rejects pending waits and closes resources idempotently", async t => {
	let streamResponse;
	let responseClosed;
	const base = await withServer(t, (_request, response) => {
		streamResponse = response;
		responseClosed = new Promise(resolve => response.once("close", resolve));
		response.writeHead(200).flushHeaders();
	});
	const capture = await openManifestAuditCapture(base);
	const pending = capture.waitFor(() => true);
	const closes = Promise.all([capture.close(), capture.close()]);
	await t.throwsAsync(pending, { message: /closed/ });
	await closes;
	await responseClosed;
	t.true(streamResponse.destroyed);
});

test("surfaces malformed JSON and settles waits", async t => {
	const base = await withServer(t, (_request, response) => response.writeHead(200).end("{broken}\n"));
	const capture = await openManifestAuditCapture(base);
	await t.throwsAsync(capture.waitFor(() => true), { instanceOf: SyntaxError });
	await capture.close();
});
