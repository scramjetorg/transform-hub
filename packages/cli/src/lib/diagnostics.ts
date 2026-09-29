import { ObjLogger, prettyPrint } from "@scramjet/obj-logger";
import { DataStream } from "scramjet";
import type { Writable } from "stream";

type DiagnosticData = Record<string, unknown>;
let logger: ObjLogger | undefined;

export function setDiagnosticLogging(verbose: boolean, stderr: Writable = process.stderr): void {
    logger = undefined;
    if (!verbose) return;
    logger = new ObjLogger("si", {}, "INFO");
    const prettyLog = new DataStream().map(prettyPrint({ colors: Boolean((stderr as NodeJS.WriteStream).isTTY) }));
    logger.addOutput(prettyLog);
    prettyLog.pipe(stderr);
}

export function diagnostic(event: string, data: DiagnosticData = {}): void {
    logger?.info(event, sanitize(data));
}

function sanitize(value: unknown): any {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !/body|credential|secret|passphrase|key|cert|fingerprint|authorization|token|header|query/i.test(key)).map(([key, item]) => [key, sanitize(item)]));
}

export function elapsed(start: number): number {
    return Date.now() - start;
}

export function safePath(path: string): string {
    const queryIndex = path.indexOf("?");
    if (queryIndex === -1) return path;
    const query = new URLSearchParams(path.slice(queryIndex + 1));
    for (const key of query.keys()) query.set(key, "<redacted>");
    return `${path.slice(0, queryIndex)}?${query}`;
}

export function profileTarget(profile: any): DiagnosticData {
    return { ingress: profile?.ingress?.level, route: profile?.ingress?.routeDomain, targetSpace: profile?.target?.spaceId, targetHub: profile?.target?.hubId };
}
