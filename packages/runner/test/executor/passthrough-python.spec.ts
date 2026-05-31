import test from "ava";
import { join } from "path";

// Transport-level passthrough test: bytes written by the outer runner to the
// runner-python child's fd4 must arrive on fd5 byte-for-byte, with NO JSON
// transformation anywhere along the path.
//
// Fixture `echo_fd4_to_fd5.py` reads raw bytes from fd4, prepends b"ECHO:",
// and writes the result to fd5. This proves the outer runner's fd4/fd5
// plumbing is a raw byte pipe.

import { pythonExecutor } from "../../src/executor/python-process-executor";

test("fd4 -> fd5 round-trip is byte-for-byte (no JSON transformation)", async (t) => {
    const handles = pythonExecutor.spawn({
        runtimeEntry: join(__dirname, "../fixtures/python/echo_fd4_to_fd5.py"),
        bootConfigPath: "/dev/null/missing-boot.json",
    });

    // Payload contains bytes that would break JSON parsing if anything tried
    // to JSON.parse the stream (NULs, raw 0xFF, unbalanced braces, newlines).
    const payload = Buffer.from([
        0x00, 0xff, 0x7b, 0x0a, 0x7d, 0x01, 0x02, 0x03,
        0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80,
    ]);
    const expected = Buffer.concat([Buffer.from("ECHO:"), payload]);

    const chunks: Buffer[] = [];
    const received: Promise<Buffer> = new Promise((resolve) => {
        let total = 0;

        handles.monitoring.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            total += chunk.length;
            if (total >= expected.length) {
                resolve(Buffer.concat(chunks).subarray(0, expected.length));
            }
        });
    });

    handles.control.write(payload);
    handles.control.end();

    const got = await received;

    // Byte-for-byte equality - no JSON.parse anywhere in the path.
    t.true(Buffer.isBuffer(got));
    t.is(got.length, expected.length);
    t.deepEqual(got, expected);

    handles.child.kill();
    await new Promise((resolve) => handles.child.on("close", resolve));
});
