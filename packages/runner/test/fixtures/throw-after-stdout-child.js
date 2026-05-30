"use strict";

// Fixture child for runner-lifecycle-ordering.spec.ts.
//
// Writes deterministic markers to stdout and stderr, then synchronously
// throws so Node prints the uncaught-exception report to stderr and exits
// with a non-zero code. The parent uses `child.on("close", ...)` as the
// ordering barrier - by the time `close` fires, all stdio has flushed, so
// the parent's terminal lifecycle frame is guaranteed to be observed
// after these stdout/stderr bytes.

process.stdout.write("STDOUT_BEFORE_THROW\n");
process.stderr.write("STDERR_BEFORE_THROW\n");

// Force flush of stdout before throwing on a synchronous fd.
// `process.stdout` is synchronous on pipes, but be explicit for clarity.

throw new Error("intentional-throw-after-stdout");
