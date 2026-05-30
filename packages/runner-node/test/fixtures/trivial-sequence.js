"use strict";

// Trivial fixture sequence for runner-node skeleton tests.
//
// Returns a primitive (`0`) so `runSequence()` exercises the primitive
// branch (no streamable output): writes `"0"` to the host outputStream and
// emits a single empty PANG frame to the monitor stream. This keeps the
// fixture a one-function sequence while staying fully compatible with the
// real runtime entry that runner-node now uses.
module.exports = [
    function trivialSequence() {
        return 0;
    },
];
