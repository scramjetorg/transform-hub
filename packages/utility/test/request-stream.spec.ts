import test from "ava";
import { PassThrough } from "stream";

import { getRequestBytesRead, getRequestBytesWritten, getRequestRemoteAddress, onRequestSocketEvent, trackStreamBytes } from "../src/request-stream";

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

test("request byte helpers fall back to stream lengths", t => {
    const request = new PassThrough();
    const fallback = new PassThrough();

    fallback.write("payload");

    t.is(getRequestBytesRead(request, fallback), 7);
    t.is(getRequestBytesWritten(request, fallback), 7);
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

test("stream byte tracker counts chunks without a socket", t => {
    const stream = new PassThrough();
    const bytes = trackStreamBytes(stream);

    stream.write("payload");
    stream.write(Buffer.from("-buffer"));

    t.is(bytes(), 14);
});
