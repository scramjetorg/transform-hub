import test from "ava";
import { CommonLogsPipe } from "../src/lib/common-logs-pipe";
import { PassThrough, Writable } from "stream";

test("CommonLogsPipe: addInStream pipes data with host prefix", (t) => {
  const clp = new CommonLogsPipe(1000);

  const source = new PassThrough();
  clp.addInStream("host-1", source);

  const out = clp.getOut();

  const chunks: string[] = [];
  out.on("data", (chunk: string) => chunks.push(chunk.toString()));

  source.write("hello\n");
  source.end();

  // Drain the out stream to get data flowing
  out.resume();

  return new Promise<void>((resolve) => {
    // Use setImmediate to let the stream events propagate
    setImmediate(() => {
      const combined = chunks.join("");
      t.true(combined.includes("host-1: "));
      t.true(combined.includes("hello"));
      resolve();
    });
  });
});

test("CommonLogsPipe: removeInStream stops piping", (t) => {
  const clp = new CommonLogsPipe(1000);

  const source = new PassThrough();
  clp.addInStream("host-1", source);
  clp.removeInStream("host-1");

  const out = clp.getOut();

  // Write after removal - should not appear on output
  source.write("should-not-appear\n");
  source.end();

  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      const data = out.read();
      t.is(data, null);
      resolve();
    }, 50);

    out.on("data", () => {
      clearTimeout(timer);
      // Data arriving means a failure condition
      t.fail("Data should not have arrived after removeInStream");
      resolve();
    });

    out.resume();
  });
});

test("CommonLogsPipe: getIn returns writable side", (t) => {
  const clp = new CommonLogsPipe(1000);
  const writable = clp.getIn();

  t.not(writable, undefined);
  t.true(writable instanceof Writable || typeof (writable as any).write === "function");
});

test("CommonLogsPipe: multiple in streams get prefixed separately", (t) => {
  const clp = new CommonLogsPipe(1000);

  const source1 = new PassThrough();
  const source2 = new PassThrough();

  clp.addInStream("host-a", source1);
  clp.addInStream("host-b", source2);

  const out = clp.getOut();

  const chunks: string[] = [];
  out.on("data", (chunk: string) => chunks.push(chunk.toString()));

  source1.write("msg1\n");
  source2.write("msg2\n");
  source1.end();
  source2.end();
  out.resume();

  return new Promise<void>((resolve) => {
    setImmediate(() => {
      const combined = chunks.join("");
      t.true(combined.includes("host-a: msg1"));
      t.true(combined.includes("host-b: msg2"));
      resolve();
    });
  });
});

test("CommonLogsPipe: does not pause source streams under high throughput", async (t) => {
  const numberOfLogs = 1e3;
  const bufferLength = numberOfLogs / 100;

  const clp = new CommonLogsPipe(bufferLength);
  const source = new PassThrough();

  source.on("data", () => {});
  clp.addInStream("host-1", source);

  const out = clp.getOut();
  out.on("data", () => {});

  for (let i = 0; i < numberOfLogs; i++) {
    source.write(`Log ${i}\n`);
  }

  await new Promise((resolve) => setImmediate(resolve));

  t.false(source.isPaused());
  source.end();
});

test("CommonLogsPipe: multiple in streams all pass through", async (t) => {
  const clp = new CommonLogsPipe(10000);

  const sources = [new PassThrough(), new PassThrough(), new PassThrough()];
  sources.forEach((s, i) => clp.addInStream(`host-${i}`, s));

  const out = clp.getOut();

  const chunks: string[] = [];
  out.on("data", (chunk: string) => chunks.push(chunk.toString()));
  out.resume();

  sources.forEach((source, idx) => {
    const linesPerSource = 100;
    for (let i = 0; i < linesPerSource; i++) {
      source.write(`line-${idx}-${i}\n`);
    }
    source.end();
  });

  // Wait for streams to end, then let pipe flush
  await Promise.all(sources.map((s) => new Promise((r) => s.on("end", r))));
  await new Promise((resolve) => setImmediate(resolve));

  t.true(chunks.length > 0, "Expected some data in output pipe");
});
