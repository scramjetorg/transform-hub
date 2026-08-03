"use strict";

const defer = timeout => new Promise(resolve => setTimeout(resolve, timeout));

async function waitForInstanceDetachment({ instanceId, sequenceId, listInstanceIds, listSequenceInstanceIds, timeoutMs = 10000, intervalMs = 50 }) {
    const deadline = Date.now() + timeoutMs;
    let lastInstanceIds = [];
    let lastSequenceInstanceIds = [];

    while (Date.now() < deadline) {
        lastInstanceIds = await listInstanceIds();
        lastSequenceInstanceIds = await listSequenceInstanceIds();

        if (!lastInstanceIds.includes(instanceId) && !lastSequenceInstanceIds.includes(instanceId)) {
            return;
        }

        await defer(Math.min(intervalMs, Math.max(1, deadline - Date.now())));
    }

    throw new Error(
        `Instance ${instanceId} did not detach from sequence ${sequenceId} within ${timeoutMs}ms; ` +
        `host instances=${JSON.stringify(lastInstanceIds)}, sequence instances=${JSON.stringify(lastSequenceInstanceIds)}`
    );
}

module.exports = { waitForInstanceDetachment };
