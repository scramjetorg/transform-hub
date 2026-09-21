import test from "ava";

import { waitForChildClose, waitForChildCloseAndConnection } from "../../src/executor/child-close";

test("waitForChildClose captures a child that closes during listener registration", async t => {
    const child = {
        once: (_event: "close", listener: (code: number | null, signal: NodeJS.Signals | null) => void) => {
            listener(23, null);
            return child;
        }
    };
    const close = waitForChildClose(child);

    t.deepEqual(await close, { code: 23, signal: null });
});

test("nonzero close waits for deferred connection before finalizing once", async t => {
    let resolveConnection!: () => void;
    const connection = new Promise<void>(resolve => { resolveConnection = resolve; });
    let closeListener!: (code: number | null, signal: NodeJS.Signals | null) => void;
    const childClose = waitForChildClose({
        once: (_event, listener) => {
            closeListener = listener;
        }
    });
    let finalizations = 0;
    const coordinated = waitForChildCloseAndConnection(childClose, connection).then(({ close }) => {
        finalizations += 1;
        return close;
    });

    closeListener(23, null);
    await new Promise(resolve => setImmediate(resolve));
    t.is(finalizations, 0);

    resolveConnection();
    t.deepEqual(await coordinated, { code: 23, signal: null });
    t.is(finalizations, 1);
});
