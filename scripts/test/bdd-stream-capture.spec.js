const test = require("ava");
const { PassThrough } = require("stream");
const { collectStreamUntilEndOrSignal } = require("../../bdd/lib/stream-capture.js");

test("collectStreamUntilEndOrSignal preserves bytes when the stream never ends", async t => {

	const stream = new PassThrough();
	let complete;
	const completion = new Promise(resolve => { complete = resolve; });
	const captured = collectStreamUntilEndOrSignal(stream, completion, 1);

	stream.write("Cleaning up... ");
	stream.write("Cleanup done.\n");
	complete();

	t.is(await captured, "Cleaning up... Cleanup done.\n");
});

test("collectStreamUntilEndOrSignal resolves normally on stream end", async t => {
	const stream = new PassThrough();
	const completion = new Promise(() => undefined);
	const captured = collectStreamUntilEndOrSignal(stream, completion);

	stream.end("complete\n");

	t.is(await captured, "complete\n");
});
