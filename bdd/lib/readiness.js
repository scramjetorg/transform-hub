"use strict";

const defer = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));

async function waitForCondition(check, isReady, options = {}) {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 50;
    const started = Date.now();
    let last;
    let lastError;
    const deadline = started + timeoutMs;
    do {
        const remaining = Math.max(0, deadline - Date.now());
        if (remaining === 0) break;
        let timer;
        try {
            last = await Promise.race([
                Promise.resolve().then(check),
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`check exceeded remaining deadline (${remaining}ms)`)), remaining);
                })
            ]);
            if (isReady(last)) return last;
        } catch (error) {
            lastError = error;
            if (String(error?.message || error).includes("exceeded remaining deadline")) break;
        } finally {
            if (timer) clearTimeout(timer);
        }
        const delay = Math.min(intervalMs, Math.max(1, deadline - Date.now()));
        if (Date.now() >= deadline) break;
        await defer(delay);
    } while (Date.now() < deadline);
    const observed = lastError ? `last error=${String(lastError)}` : `last value=${JSON.stringify(last)}`;
    throw new Error(`${options.description || "Condition"} was not ready within ${timeoutMs}ms (${observed})`);
}

module.exports = { waitForCondition };
