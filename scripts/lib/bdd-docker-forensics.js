const MAX_RAW_OUTPUT = 64 * 1024;
const MAX_EVENTS = 128;

function bounded(value, limit = MAX_RAW_OUTPUT) {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit)}...[truncated]` : text;
}

function createForensicRecorder({ enabled = false, now = () => new Date().toISOString() } = {}) {
    const events = [];
    const record = (type, details = {}) => {
        if (!enabled) return;
        events.push({ timestamp: now(), type, ...details });
        if (events.length > MAX_EVENTS) events.shift();
    };
    return {
        enabled,
        record,
        events,
        bounded,
        snapshot() {
            return { events: events.slice() };
        }
    };
}

function parseWaitResult(stdout) {
    const rawStdout = bounded(stdout);
    const firstLine = rawStdout.split(/\r?\n/, 1)[0].trim();
    const parsedStatus = Number.parseInt(firstLine, 10);
    return {
        rawStdout,
        parsedStatus: Number.isFinite(parsedStatus) ? parsedStatus : null
    };
}

module.exports = { MAX_RAW_OUTPUT, MAX_EVENTS, bounded, parseWaitResult, createForensicRecorder };
