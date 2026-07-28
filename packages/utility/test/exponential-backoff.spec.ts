import test from "ava";

import { BackoffTimer, createExponentialBackoff } from "../src/exponential-backoff";

class FakeTimer implements BackoffTimer {
    private nextId = 0;
    readonly delays: number[] = [];
    private readonly callbacks = new Map<number, () => void>();

    get pendingCount() {
        return this.callbacks.size;
    }

    setTimeout(callback: () => void, delay: number) {
        const id = this.nextId++;
        this.delays.push(delay);
        this.callbacks.set(id, callback);
        return id;
    }

    clearTimeout(id: number) {
        this.callbacks.delete(id);
    }

    runNext() {
        const next = this.callbacks.entries().next();
        if (next.done) throw new Error("No timer is pending");
        const [id, callback] = next.value;
        this.callbacks.delete(id);
        callback();
    }
}

test("backoff increases delays and caps them", async t => {
    const timer = new FakeTimer();
    const backoff = createExponentialBackoff({ initialDelay: 10, maxDelay: 25, timer });

    for (let index = 0; index < 4; index += 1) {
        const wait = backoff();
        timer.runNext();
        await wait;
    }

    t.deepEqual(timer.delays, [10, 20, 25, 25]);
    t.is(backoff.attempts, 4);
});

test("backoff cancellation resolves the pending promise and clears its timer", async t => {
    const timer = new FakeTimer();
    const backoff = createExponentialBackoff({ initialDelay: 10, maxDelay: 20, timer });
    const wait = backoff();

    t.true(wait.cancel());
    await wait;
    t.is(timer.pendingCount, 0);
});

test("success resets the next backoff delay", async t => {
    const timer = new FakeTimer();
    const backoff = createExponentialBackoff({ initialDelay: 10, maxDelay: 80, timer });

    const first = backoff();
    timer.runNext();
    await first;
    const second = backoff();
    timer.runNext();
    await second;
    backoff.success();
    backoff.success();
    const reset = backoff();
    timer.runNext();
    await reset;

    t.deepEqual(timer.delays, [10, 20, 10]);
    t.is(backoff.attempts, 1);
});

test("cancellation is idempotent", async t => {
    const timer = new FakeTimer();
    const backoff = createExponentialBackoff({ initialDelay: 10, maxDelay: 20, timer });
    const wait = backoff();

    t.true(backoff.cancel());
    t.false(wait.cancel());
    t.false(backoff.cancel());
    await wait;
});

test("settled and cancelled waits leave no dangling timers", async t => {
    const timer = new FakeTimer();
    const backoff = createExponentialBackoff({ initialDelay: 10, maxDelay: 20, timer });
    const completed = backoff();
    const cancelled = backoff();

    timer.runNext();
    await completed;
    t.true(cancelled.cancel());
    await cancelled;

    t.is(timer.pendingCount, 0);
    t.false(backoff.cancel());
});
