import test from "ava";
import { PassThrough } from "stream";

import { createByteCounterStream, getRequestBytesRead, getRequestBytesWritten, getRequestRemoteAddress, onRequestDisconnect, onRequestSocketEvent } from "../src/request-stream";

test("request byte helpers prefer socket counters", t => {
    const request = {
        readableLength: 3,
        socket: {
            bytesRead: 11,
            bytesWritten: 13,
            remoteAddress: "127.0.0.1"
        }
    };

    t.is(getRequestBytesRead(request), 11);
    t.is(getRequestBytesWritten(request), 13);
    t.is(getRequestRemoteAddress(request), "127.0.0.1");
});

test("request byte helpers use explicit fallback counters", t => {
    t.is(getRequestBytesRead({}, { bytesRead: 7 }), 7);
    t.is(getRequestBytesWritten({}, { bytesWritten: 5 }), 5);
});

test("written byte helper does not use readable counters", t => {
    t.is(getRequestBytesWritten({ bytesRead: 10 }), 0);
    t.is(getRequestBytesWritten({}, { bytesRead: 10 }), 0);
});

test("request byte helpers tolerate missing socket and stream counters", t => {
    t.is(getRequestBytesRead({}), 0);
    t.is(getRequestBytesWritten({}), 0);
    t.is(getRequestRemoteAddress({}), undefined);
    t.notThrows(() => onRequestSocketEvent({}, "end", () => t.fail("listener should not run")));
});

test("socket event helper attaches to existing sockets", t => {
    const socket = new PassThrough();
    let called = false;

    onRequestSocketEvent({ socket }, "end", () => {
        called = true;
    });
    socket.emit("end");

    t.true(called);
});

test("request disconnect helper falls back to request events", t => {
    const request = new PassThrough();
    let calls = 0;

    onRequestDisconnect(request, () => {
        calls += 1;
    });

    request.emit("close");
    request.emit("error", new Error("already handled"));

    t.is(calls, 1);
});

test("byte counter stream counts chunks while passing them through", async t => {
    const counter = createByteCounterStream();
    const chunks: string[] = [];

    counter.on("data", chunk => chunks.push(String(chunk)));
    counter.write("payload");
    counter.write(Buffer.from("-buffer"));
    counter.end();
    await new Promise(resolve => counter.once("end", resolve));

    t.deepEqual(chunks, ["payload", "-buffer"]);
    t.is(counter.getBytes(), 14);
});
