import test from "ava";

import { promiseTimeout } from "../src/promise-timeout";

type TimerId = ReturnType<typeof setTimeout>;

/**
 * Wraps the global timer functions so a test can observe which timers
 * promiseTimeout schedules and whether they are cleared with clearTimeout
 * before the deadline elapses.
 */
const installTimerSpy = () => {
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    const scheduled: TimerId[] = [];
    const cleared = new Set<TimerId>();

    global.setTimeout = ((callback: (...args: any[]) => void, timeout?: number, ...args: any[]) => {
        const timer = originalSetTimeout(callback, timeout, ...args);
        scheduled.push(timer);
        return timer;
    }) as typeof setTimeout;

    global.clearTimeout = ((timer?: TimerId) => {
        if (timer) cleared.add(timer);
        return originalClearTimeout(timer);
    }) as typeof clearTimeout;

    return {
        scheduled,
        cleared,
        restore: () => {
            global.setTimeout = originalSetTimeout;
            global.clearTimeout = originalClearTimeout;
            for (const timer of scheduled) originalClearTimeout(timer);
        }
    };
};

const rejectedWith = async <T>(promise: Promise<T>): Promise<{ rejected: boolean; reason: unknown }> => {
    try {
        await promise;
        return { rejected: false, reason: undefined };
    } catch (error) {
        return { rejected: true, reason: error };
    }
};

test.serial("early resolve settles with the value and clears the deadline timer", async t => {
    const spy = installTimerSpy();
    t.teardown(() => spy.restore());

    const scheduledBefore = spy.scheduled.length;
    const promise = promiseTimeout(Promise.resolve("ok"), 10_000);
    const deadlineTimers = spy.scheduled.slice(scheduledBefore);

    t.is(await promise, "ok");
    t.true(deadlineTimers.length > 0, "promiseTimeout must schedule a deadline timer");
    for (const timer of deadlineTimers) {
        t.true(spy.cleared.has(timer), "deadline timer must be cleared after early resolve");
    }
});

test.serial("early reject propagates the error and clears the deadline timer", async t => {
    const spy = installTimerSpy();
    t.teardown(() => spy.restore());

    const scheduledBefore = spy.scheduled.length;
    const promise = promiseTimeout(Promise.reject(new Error("boom")), 10_000);
    const deadlineTimers = spy.scheduled.slice(scheduledBefore);

    const { rejected, reason } = await rejectedWith(promise);

    t.true(rejected);
    t.is((reason as Error).message, "boom");
    t.true(deadlineTimers.length > 0, "promiseTimeout must schedule a deadline timer");
    for (const timer of deadlineTimers) {
        t.true(spy.cleared.has(timer), "deadline timer must be cleared after early reject");
    }
});

test("timeout rejects with the explicit reject value", async t => {
    const { rejected, reason } = await rejectedWith(promiseTimeout(new Promise(() => {}), 10, "timed out"));

    t.true(rejected);
    t.is(reason, "timed out");
});

test("timeout rejects with undefined by default", async t => {
    const { rejected, reason } = await rejectedWith(promiseTimeout(new Promise(() => {}), 10));

    t.true(rejected);
    t.is(reason, undefined);
});
