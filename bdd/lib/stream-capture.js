const DEFAULT_DRAIN_GRACE_MS = 100;

/**
 * Collect a stream until it ends, or until the owning process has completed.
 *
 * Some runner transports deliver the final stdout bytes without closing the
 * exposed stream. The completion signal is therefore a bounded fallback: it
 * allows already-buffered bytes, plus a short final drain window, to be
 * asserted without waiting for the stream's end event indefinitely.
 */
function collectStreamUntilEndOrSignal(stream, completion, drainGraceMs = DEFAULT_DRAIN_GRACE_MS) {
    const chunks = [];

    return new Promise((resolve, reject) => {
        let settled = false;
        let drainTimer;

        const cleanup = () => {
            if (drainTimer) clearTimeout(drainTimer);
            stream.off("data", onData);
            stream.off("end", onEnd);
            stream.off("error", onError);
        };

        const finish = () => {
            if (settled) return;
            settled = true;
            if (drainTimer) clearTimeout(drainTimer);
            stream.off("data", onData);
            stream.off("end", onEnd);
            const result = Buffer.concat(chunks).toString("utf8");
            chunks.length = 0;
            // Drain rather than destroying a node-fetch IncomingMessage. Its
            // socket reports ERR_STREAM_PREMATURE_CLOSE when a live data
            // listener is torn down before the owning runner closes it.
            stream.resume?.();
            stream.once("close", () => stream.off("error", onError));
            resolve(result);
        };

        const onData = chunk => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        };
        const onEnd = () => finish();
        const onError = error => {
            if (settled) return;
            settled = true;
            cleanup();
            chunks.length = 0;
            stream.pause?.();
            if (!stream.destroyed) stream.destroy?.();
            reject(error);
        };

        stream.on("data", onData);
        stream.once("end", onEnd);
        stream.once("error", onError);

        completion.then(() => {
            if (!settled) drainTimer = setTimeout(finish, drainGraceMs);
        });
    });
}

module.exports = { collectStreamUntilEndOrSignal };
