const EXPECTED_ABORT_CODES = new Set(["ABORT_ERR", "ECONNRESET", "ERR_STREAM_PREMATURE_CLOSE"]);

function isExpectedAbortError(error, seen = new Set()) {
    if (!error || typeof error !== "object" || seen.has(error)) return false;
    seen.add(error);
    if (EXPECTED_ABORT_CODES.has(error.code) || error.name === "AbortError") return true;
    return isExpectedAbortError(error.cause, seen) || isExpectedAbortError(error.reason, seen) || isExpectedAbortError(error.source, seen);
}

async function teardownFloodSource(resources, timeoutMs = 30000) {
    const stream = resources.floodStream;
    const sendPromise = resources.floodSendPromise;
    const responseClosedPromise = resources.floodResponseClosedPromise;
    const hubRequestLifecycleWaiter = resources.floodHubRequestLifecycleWaiter;
    const sourceClosedPromise = resources.floodSourceClosedPromise;
    const abortController = resources.floodAbortController;
    resources.floodStream = undefined;
    resources.floodSendPromise = undefined;
    resources.floodResponseClosedPromise = undefined;
    resources.floodHubRequestLifecycleWaiter = undefined;
    resources.floodSourceClosedPromise = undefined;
    resources.floodAbortController = undefined;
    abortController?.abort();
    stream?.destroy?.();
    if (!sendPromise && !sourceClosedPromise && !responseClosedPromise && !hubRequestLifecycleWaiter) return;

    let timer;
    try {
        const pending = new Set();
        const track = (name, promise) => {
            pending.add(name);
            return Promise.resolve(promise).finally(() => pending.delete(name));
        };
        const hubAcknowledgement = hubRequestLifecycleWaiter?.promise;
        await Promise.race([
            Promise.all([
                track("client-utils", Promise.resolve(sendPromise).then(body => {
                    body?.resume?.();
                    body?.destroy?.();
                }).catch(error => {
                    if (isExpectedAbortError(error)) return;
                    throw error;
                })),
                track("source", Promise.resolve(sourceClosedPromise).catch(error => {
                    if (isExpectedAbortError(error)) return;
                    throw error;
                })),
                track("response", Promise.resolve(responseClosedPromise).catch(error => {
                    if (isExpectedAbortError(error)) return;
                    throw error;
                })),
                track("hub", Promise.resolve(hubAcknowledgement)),
            ]),
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`Flood send did not settle within ${timeoutMs}ms after source abort; pending=${[...pending].join(",")}`)), timeoutMs);
            }),
        ]);
        resources.markFloodRunnerExpected?.();
    } finally {
        if (timer) clearTimeout(timer);
        hubRequestLifecycleWaiter?.cancel();
    }
}

module.exports = { teardownFloodSource };
