const TRACE_LIMIT = 32 * 1024;
const IDENTIFIER_LIMIT = 256;

export type HostExitEvent = { code: number | null; signal: NodeJS.Signals | null };

const redactSecrets = (value: string): string => value
    .replace(/(bearer\s+)[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:token|password|passwd|secret|authorization|cookie|api[-_ ]?key)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[REDACTED]")
    .replace(/(https?:\/\/)([^\s/@]+)@/gi, "$1[REDACTED]@");

const redactPrivateKeys = (value: string): string => value.replace(
    /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
    "[REDACTED PRIVATE KEY]"
);

export const redactLifecycleTrace = (value: string): string => redactPrivateKeys(redactSecrets(value));

const truncateUtf8 = (value: string, maxBytes: number): string => {
    if (maxBytes <= 0) return "";
    const bytes = Buffer.from(value, "utf8");
    if (bytes.length <= maxBytes) return value;

    let result = "";
    let usedBytes = 0;
    for (const character of value) {
        const characterBytes = Buffer.byteLength(character, "utf8");
        if (usedBytes + characterBytes > maxBytes) break;
        result += character;
        usedBytes += characterBytes;
    }
    return result;
};

const truncateUtf8Suffix = (value: string, maxBytes: number): string => {
    if (maxBytes <= 0) return "";
    const bytes = Buffer.from(value, "utf8");
    if (bytes.length <= maxBytes) return value;

    let start = bytes.length - maxBytes;
    while (start < bytes.length && (bytes[start] & 0xc0) === 0x80) start += 1;
    return bytes.subarray(start).toString("utf8");
};

export class LifecycleTrace {
    private tail = "";
    private readonly instanceIds = new Set<string>();
    private readonly runnerPids = new Set<number>();
    private disposed = false;
    private rendered = false;

    addInstanceId(id: unknown): void {
        if (!this.disposed && typeof id === "string" && id) {
            const redacted = truncateUtf8(redactLifecycleTrace(id), IDENTIFIER_LIMIT);
            if (redacted) this.instanceIds.add(redacted);
        }
    }

    addRunnerPid(pid: unknown): void {
        if (!this.disposed && typeof pid === "number" && Number.isFinite(pid) && pid > 0) this.runnerPids.add(pid);
    }

    recordHostStdout(value: string): void { this.record("host stdout", value); }
    recordHostStderr(value: string): void { this.record("host stderr", value); }
    recordHostExit(event: HostExitEvent): void { this.record("host exit", JSON.stringify(event)); }

    render(reason = "scenario failure"): void {
        if (this.disposed || this.rendered) return;
        this.rendered = true;
        const metadata = [
            `reason=${reason}`,
            `instanceIds=${JSON.stringify([...this.instanceIds])}`,
            `runnerPids=${JSON.stringify([...this.runnerPids])}`,
        ].join("\n");
        const begin = "--- BDD LIFECYCLE TRACE BEGIN ---\n";
        const end = "\n--- BDD LIFECYCLE TRACE END ---\n";
        const body = `${redactLifecycleTrace(metadata)}\n${redactLifecycleTrace(this.tail)}`;
        const bodyBudget = Math.max(0, TRACE_LIMIT - Buffer.byteLength(begin, "utf8") - Buffer.byteLength(end, "utf8"));
        const block = begin + truncateUtf8(body, bodyBudget) + end;
        try { process.stderr.write(block); } catch { /* diagnostics must never mask the scenario failure */ }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.tail = "";
        this.instanceIds.clear();
        this.runnerPids.clear();
    }

    private record(label: string, value: string): void {
        if (this.disposed) return;
        const bounded = truncateUtf8Suffix(redactLifecycleTrace(String(value)), TRACE_LIMIT);
        this.tail = truncateUtf8Suffix(`${this.tail}\n[${label}]\n${bounded}`, TRACE_LIMIT);
    }
}

export const lifecycleTraceLimit = TRACE_LIMIT;
