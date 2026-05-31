"use strict";

// Fixture child for five-pipe-transport.spec.ts
//
// stdio layout expected from the parent:
//   fd0 stdin   (pipe)
//   fd1 stdout  (pipe) - emits known markers only
//   fd2 stderr  (pipe) - emits known markers only
//   fd3 ipc     (reserved by Node when stdio entry is "ipc")
//   fd4 pipe    (extra duplex - echoes whatever it receives back)
//   fd5 pipe    (extra duplex - echoes whatever it receives back)
//
const net = require("net");

// Bytes received on fd4 are echoed back on fd4; same for fd5. Independent.
const fd4 = new net.Socket({ fd: 4, readable: true, writable: true });
const fd5 = new net.Socket({ fd: 5, readable: true, writable: true });

fd4.on("data", (chunk) => {
    fd4.write(chunk);
});
fd5.on("data", (chunk) => {
    fd5.write(chunk);
});

fd4.on("error", (err) => {
    process.stderr.write("FD4_ERR:" + err.message + "\n");
});
fd5.on("error", (err) => {
    process.stderr.write("FD5_ERR:" + err.message + "\n");
});

// Markers used by the parent to assert stream independence.
process.stdout.write("STDOUT_MARK\n");
process.stderr.write("STDERR_MARK\n");

const ipcSend = process["send"];

process.stdout.write("HAS_SEND:" + (typeof ipcSend === "function") + "\n");
process.stdout.write("ENV_SECRET:" + (process.env.RUNNER_EXECUTOR_SECRET || "") + "\n");

// Keep the child alive until the parent kills it. fd4/fd5 sockets keep the
// loop alive automatically; nothing else to do.
