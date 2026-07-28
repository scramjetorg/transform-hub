import { cmd, type CommandDescriptor } from "@scramjet/config";
import { constants, createReadStream, createWriteStream, fstatSync, openSync } from "fs";
import { finished, pipeline } from "stream/promises";
import { Readable } from "stream";
import { createVerserBroker, type VerserBroker, type VerserBrokerResponse } from "@signicode/verser2-guest-node";
import { createVerser2ClientTransport, RoutedBrokerCancelledError, RoutedBrokerDuplicateRouteError, RoutedBrokerRedirectError, RoutedBrokerRequestError, RoutedBrokerResponseLimitError, RoutedBrokerRouteUnavailableError, RoutedBrokerTimeoutError, type ManagedVerser2ClientTransport, type RoutedBrokerResponse, type RoutedBrokerTransport } from "@scramjet/api-router";
import { profileManager } from "../config";
import { validateVerser2Bootstrap, validateVerser2Profile } from "../config/verser2Profile";
import { ApiCommandError } from "../apiCommandError";

export { ApiCommandError } from "../apiCommandError";

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]);
const DESTRUCTIVE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const FORBIDDEN_HEADERS = new Set(["host", "connection", "keep-alive", "transfer-encoding", "upgrade", "content-length"]);
const JOINABLE_HEADERS = new Set(["accept", "accept-encoding", "cache-control", "pragma", "vary"]);
const RESPONSE_LIMIT = 1024 * 1024;

export type ApiDependencies = {
    getProfile(): any;
    createBroker(options: Parameters<typeof createVerserBroker>[0]): VerserBroker;
    stdin: Readable & { isTTY?: boolean };
    stdout: NodeJS.WriteStream;
    stderr: NodeJS.WriteStream;
};
const productionDependencies: ApiDependencies = { getProfile: () => profileManager.getProfileConfig().get().verser2, createBroker: createVerserBroker, stdin: process.stdin, stdout: process.stdout, stderr: process.stderr };
let dependencies = productionDependencies;
/** Test seam; production always uses the native broker and process IO. */
export function setApiDependencies(overrides?: Partial<ApiDependencies>) { dependencies = overrides ? { ...productionDependencies, ...overrides } : productionDependencies; }

export function apiPath(value: string): string {
    if (!value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("\\")) throw new ApiCommandError("USAGE", 1, "API path must be absolute");
    return value.startsWith("/api/v2/") ? value : `/api/v2${value}`;
}
export function apiPairs(values: string[] = [], separator: string, label: string): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    for (const value of values) {
        const index = value.indexOf(separator); const key = value.slice(0, index).trim(); const item = value.slice(index + 1).trim();
        if (index < 1 || !key || !item) throw new ApiCommandError("USAGE", 1, `Invalid ${label}: ${value}`);
        const old = result[key]; result[key] = old === undefined ? item : Array.isArray(old) ? [...old, item] : [old, item];
    }
    return result;
}
export function apiHeaders(values: string[] = []): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [name, headerValues] of Object.entries(apiPairs(values, ":", "header"))) {
        const key = name.toLowerCase();
        if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(name) || /[\r\n]/.test(Array.isArray(headerValues) ? headerValues.join("") : headerValues)) throw new ApiCommandError("USAGE", 1, "Invalid request header");
        if (FORBIDDEN_HEADERS.has(key) || key.startsWith("x-scramjet-")) throw new ApiCommandError("USAGE", 1, `Forbidden request header: ${name}`);
        if (Array.isArray(headerValues) && !JOINABLE_HEADERS.has(key)) throw new ApiCommandError("USAGE", 1, `Duplicate request header: ${name}`);
        if (headers[key] !== undefined) throw new ApiCommandError("USAGE", 1, `Duplicate request header: ${name}`);
        headers[key] = Array.isArray(headerValues) ? headerValues.join(", ") : headerValues;
    }
    return headers;
}
type PreparedBody = { body?: readonly Buffer[] | Readable; defaultContentType?: string; destroy(): void };
function prepareBody(options: Record<string, unknown>, input: Readable): PreparedBody {
    const sources = ["json", "file", "stdin", "binary"].filter(key => options[key] !== undefined && options[key] !== false);
    if (sources.length > 1) throw new ApiCommandError("USAGE", 1, "Only one body input may be used");
    if (!sources.length) return { destroy() {} };
    if (options.json !== undefined) { try { return { body: [Buffer.from(JSON.stringify(JSON.parse(String(options.json))))], defaultContentType: "application/json", destroy() {} }; } catch { throw new ApiCommandError("USAGE", 1, "--json must contain valid JSON"); } }
    if (options.binary !== undefined) { const value = String(options.binary); if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new ApiCommandError("USAGE", 1, "--binary must be base64"); return { body: [Buffer.from(value, "base64")], defaultContentType: "application/octet-stream", destroy() {} }; }
    if (options.file !== undefined) { let descriptor: number; try { descriptor = openSync(String(options.file), constants.O_RDONLY | ((constants as any).O_NOFOLLOW || 0)); if (!fstatSync(descriptor).isFile()) throw new Error("not-file"); } catch { throw new ApiCommandError("USAGE", 1, "Request body file is unreadable"); } const stream = createReadStream(String(options.file), { fd: descriptor, autoClose: true }); return { body: stream, defaultContentType: "application/octet-stream", destroy: () => stream.destroy() }; }
    return { body: input, defaultContentType: "application/octet-stream", destroy: () => { if (!input.destroyed) input.destroy(); } };
}
export function apiBody(options: Record<string, unknown>) { const body = prepareBody(options, dependencies.stdin); return { body: body.body, headers: body.defaultContentType ? { "content-type": body.defaultContentType } : {} }; }
function abortable<T>(promise: Promise<T>, signal: AbortSignal, timeoutMs?: number): Promise<T> {
    if (signal.aborted) return Promise.reject(new ApiCommandError("CANCELLED", 60, "Request cancelled"));
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(new ApiCommandError("CANCELLED", 60, "Request cancelled"));
        const timer = timeoutMs ? setTimeout(() => reject(new ApiCommandError("TIMEOUT", 57, "Request timed out")), timeoutMs) : undefined;
        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(resolve, reject).finally(() => { signal.removeEventListener("abort", onAbort); if (timer) clearTimeout(timer); });
    });
}
async function confirmation(method: string, options: Record<string, unknown>, input = dependencies.stdin, stderr = dependencies.stderr) {
    if (!DESTRUCTIVE.has(method) || options.confirm === false) return;
    if (options.stdin) throw new ApiCommandError("USAGE", 1, "--stdin requires --no-confirm");
    if (!input.isTTY) throw new ApiCommandError("USAGE", 1, "Destructive requests require --no-confirm outside a TTY");
    stderr.write(`${method} request; type yes to continue: `);
    const answer = await new Promise<string>(resolve => input.once("data", value => resolve(String(value).trim())));
    if (answer !== "yes") throw new ApiCommandError("USAGE", 1, "Request not confirmed");
}
export { confirmation };
function appendQuery(path: string, query: Record<string, string | string[]>) { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : [value]) params.append(key, item); return params.size ? `${path}?${params}` : path; }
type ApiBrokerResponse = RoutedBrokerResponse & Pick<VerserBrokerResponse, "statusText" | "headerPairs">;
function responseAdapter(response: VerserBrokerResponse): ApiBrokerResponse {
    let cleanup: Promise<void> | undefined;
    return { status: response.statusCode, statusText: response.statusText, headers: response.headers, headerPairs: response.headerPairs, body: response.body, cleanup: () => cleanup ||= (async () => {
        // The managed upstream transport may invoke cleanup from the stream's
        // `end` listener.  Calling `finished()` after that terminal event has
        // already fired can wait forever, retaining the broker session and its
        // child CLI process.  Only wait when this cleanup owns termination.
        if (!response.body.destroyed && !response.body.readableEnded) {
            response.body.destroy();
            await finished(response.body).catch(() => {});
        }
    })() };
}
export function createVerser2CliTransport(profile: any, signal: AbortSignal): RoutedBrokerTransport {
    let material: ReturnType<typeof validateVerser2Bootstrap>;
    try { material = validateVerser2Bootstrap(profile); } catch (error) { throw profileError(error); }
    const tls: any = material.pfx ? { ca: material.ca.toString(), pfx: material.pfx, passphrase: material.passphrase } : { ca: material.ca.toString(), cert: material.cert?.toString(), key: material.key?.toString(), passphrase: material.passphrase };
    const broker = dependencies.createBroker({ hostUrl: profile.endpoint, brokerId: profile.brokerId, tls }); let connected = false; let closed = false;
    const routes = () => connected && !closed ? broker.getRoutes() : [];
    const target = (domain: string) => { const matches = routes().filter(route => route.domain === domain); if (matches.length !== 1) throw new ApiCommandError("ROUTE", 55, "Configured route is unavailable or ambiguous"); return matches[0]; };
    return {
        getRoutes: routes, isRouteReady: domain => { try { target(domain); return true; } catch { return false; } },
        async waitForRoute(domain, timeoutMs) { if (!connected) { await abortable(broker.connect(), signal, timeoutMs); connected = true; } const deadline = Date.now() + (timeoutMs || profile.timeoutMs || 10000); while (!this.isRouteReady?.(domain)) { if (signal.aborted) throw new ApiCommandError("CANCELLED", 60, "Request cancelled"); if (Date.now() >= deadline) throw new ApiCommandError("ROUTE", 55, "Configured route is not ready"); await abortable(new Promise<void>(resolve => setTimeout(resolve, 10)), signal, Math.max(1, deadline - Date.now())); } },
        async request(request) { const route = target(request.routeDomain); const response = await abortable(broker.request({ targetId: route.targetId, method: request.method, path: appendQuery(request.path, request.query || {}), headers: request.headers, body: request.body as any }), signal, request.timeoutMs); return responseAdapter(response); },
        async close() { if (!closed) { closed = true; await broker.close("cli api complete"); } }
    };
}
/**
 * Establish the one authenticated broker bridge used by both raw and contract
 * clients.  Keeping ingress proof here prevents named commands from growing a
 * second connection, identity, and cleanup stack.
 */
export async function createVerifiedVerser2Session(profile: any, signal: AbortSignal, timeoutMs = profile.timeoutMs, suppliedTransport?: RoutedBrokerTransport): Promise<{ transport: RoutedBrokerTransport; client: ManagedVerser2ClientTransport; close(): Promise<void> }> {
    const transport = suppliedTransport || createVerser2CliTransport(profile, signal);
    // Minimal injected transports used by CLI contract tests predate route
    // enumeration.  Normalize them at the bridge boundary; real brokers retain
    // their route discovery and duplicate-route checks unchanged.
    const routedTransport = (transport as any).getRoutes && (transport as any).isRouteReady ? transport : {
        ...transport,
        getRoutes: () => [{ domain: profile.ingress.routeDomain, targetId: profile.ingress.routeDomain }],
        isRouteReady: () => true
    };
    const client = createVerser2ClientTransport({ transport: routedTransport, routeDomain: profile.ingress.routeDomain, routeReadinessMs: timeoutMs, requestTimeoutMs: timeoutMs });
    try {
        await transport.waitForRoute(profile.ingress.routeDomain, timeoutMs, signal);
        const identity = await transport.request({ routeDomain: profile.ingress.routeDomain, method: "GET", path: "/api/v2/ingress/identity", timeoutMs, signal });
        try {
            const proof = JSON.parse((await collect(identity.body, signal, timeoutMs)).toString());
            if (proof.level !== profile.ingress.level || proof.serviceId !== profile.ingress.expectedId || proof.routeDomain !== profile.ingress.routeDomain)
                throw new ApiCommandError("IDENTITY", 56, "Ingress identity does not match the selected profile");
        } catch (error) {
            // Cancellation and timeout are lifecycle failures, not malformed
            // identity proofs.  Retain their caller-visible exit mappings.
            if (error instanceof ApiCommandError) throw error;
            throw new ApiCommandError("IDENTITY", 56, "Ingress identity is malformed or unavailable");
        } finally {
            await identity.cleanup();
        }
        return { transport, client, close: () => client.close() };
    } catch (error) {
        await client.close().catch(() => {});
        throw mapApiError(error);
    }
}
async function collect(body: Readable, signal: AbortSignal, timeoutMs?: number): Promise<Buffer> {
    const stop = (error: Error) => { if (!body.destroyed) body.destroy(error); };
    const onAbort = () => stop(new ApiCommandError("CANCELLED", 60, "Request cancelled"));
    const timer = timeoutMs ? setTimeout(() => stop(new ApiCommandError("TIMEOUT", 57, "Request timed out")), timeoutMs) : undefined;
    const chunks: Buffer[] = []; let size = 0;
    signal.addEventListener("abort", onAbort, { once: true });
    try { for await (const chunk of body) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > RESPONSE_LIMIT) throw new ApiCommandError("RESPONSE_LIMIT", 59, "Response exceeded safe collection limit"); chunks.push(bytes); } return Buffer.concat(chunks); }
    finally { signal.removeEventListener("abort", onAbort); if (timer) clearTimeout(timer); if (signal.aborted) onAbort(); }
}
async function pipeResponse(body: Readable, output: NodeJS.WritableStream, signal: AbortSignal, timeoutMs?: number) {
    const stop = (error: Error) => { if (!body.destroyed) body.destroy(error); };
    const onAbort = () => stop(new ApiCommandError("CANCELLED", 60, "Request cancelled"));
    const timer = timeoutMs ? setTimeout(() => stop(new ApiCommandError("TIMEOUT", 57, "Request timed out")), timeoutMs) : undefined;
    signal.addEventListener("abort", onAbort, { once: true });
    try { await pipeline(body, output); }
    finally { signal.removeEventListener("abort", onAbort); if (timer) clearTimeout(timer); if (signal.aborted) onAbort(); }
}
async function streamingBody(response: ApiBrokerResponse, signal: AbortSignal, timeoutMs?: number): Promise<Readable> {
    const type = String(response.headers?.["content-type"] || "").toLowerCase();
    if (!type.includes("application/json")) return response.body;
    const iterator = response.body[Symbol.asyncIterator]();
    const buffered: Buffer[] = []; let size = 0;
    while (size <= RESPONSE_LIMIT) {
        const next = await abortable(iterator.next(), signal, timeoutMs);
        if (next.done) break;
        const bytes = Buffer.from(next.value); buffered.push(bytes); size += bytes.length;
        try {
            const error = failedOperationError(Buffer.concat(buffered));
            if (error) throw error;
            // Parsed ordinary JSON must remain a transparent byte stream.
            JSON.parse(Buffer.concat(buffered).toString());
            break;
        } catch (error) {
            if (error instanceof ApiCommandError) throw error;
        }
    }
    return Readable.from((async function*() { yield* buffered; for await (const chunk of { [Symbol.asyncIterator]: () => iterator } as any) yield chunk; })());
}
async function fsWrite(fileName: string, output: string | Buffer) { const file = createWriteStream(fileName); await new Promise<void>((resolve, reject) => { file.once("error", reject); file.end(output, resolve); }); }
function profileError(error: unknown) { const message = error instanceof Error ? error.message : "Invalid Verser2 profile"; if (/owner-only|permission/i.test(message)) return new ApiCommandError("PERMISSION", 53, "Unsafe private credential permissions"); if (/credential|passphrase|ENOENT|unreadable/i.test(message)) return new ApiCommandError("CREDENTIAL", 50, "Verser2 credential is unavailable"); return new ApiCommandError("PROFILE", 61, "Invalid Verser2 profile"); }
function validateTarget(profile: any, options: Record<string, unknown>, path: string) { const spaceId = options.spaceId || profile.target?.spaceId; const hubId = options.hubId || profile.target?.hubId; if (profile.ingress.level === "hub" && (options.spaceId || options.hubId || /^\/api\/v2\/(spaces|hubs)(?:\/|$)/.test(path))) throw new ApiCommandError("TARGET", 54, "Direct Hub ingress cannot traverse upstream"); if (profile.ingress.level === "space" && options.spaceId) throw new ApiCommandError("TARGET", 54, "Space ingress cannot select another space"); if (hubId && !spaceId && profile.ingress.level === "platform") throw new ApiCommandError("TARGET", 54, "Hub target requires a space target"); if (profile.ingress.level === "hub" && (spaceId || hubId)) throw new ApiCommandError("TARGET", 54, "Direct Hub ingress has no descendant target"); const prefix = profile.ingress.level === "platform" && spaceId ? `/api/v2/spaces/${encodeURIComponent(spaceId)}${hubId ? `/hubs/${encodeURIComponent(hubId)}` : ""}` : profile.ingress.level === "space" && hubId ? `/api/v2/hubs/${encodeURIComponent(hubId)}` : ""; return prefix ? `${prefix}${path.slice("/api/v2".length)}` : path; }
/** Keep CLI exits stable regardless of whether the error came from raw or typed broker use. */
export function mapApiError(error: unknown): ApiCommandError {
    if (error instanceof ApiCommandError) return error;
    if (error instanceof RoutedBrokerCancelledError) return new ApiCommandError("CANCELLED", 60, "Request cancelled");
    if (error instanceof RoutedBrokerRouteUnavailableError || error instanceof RoutedBrokerDuplicateRouteError) return new ApiCommandError("ROUTE", 55, "Configured route is unavailable or ambiguous");
    if (error instanceof RoutedBrokerResponseLimitError) return new ApiCommandError("RESPONSE_LIMIT", 59, "Response exceeded safe collection limit");
    if (error instanceof RoutedBrokerTimeoutError) return new ApiCommandError("TIMEOUT", 57, "Request timed out");
    // Request and redirect errors are transport failures unless the wrapped
    // cause is itself one of the canonical routed-broker conditions.
    if (error instanceof RoutedBrokerRequestError) return mapApiError(error.cause);
    if (error instanceof RoutedBrokerRedirectError) return new ApiCommandError("CONNECTION", 58, "Verser2 broker redirect failed");
    const message = error instanceof Error ? error.message : "Broker connection failed";
    if (/authentication|alert certificate|certificate required/i.test(message)) return new ApiCommandError("AUTH", 52, "TLS client authentication failed");
    if (/certificate|self.?signed|unable to verify|ca /i.test(message)) return new ApiCommandError("TRUST", 51, "TLS trust validation failed");
    if (/timed out/i.test(message)) return new ApiCommandError("TIMEOUT", 57, "Request timed out");
    return new ApiCommandError("CONNECTION", 58, "Verser2 broker connection failed");
}
function failedOperationError(bytes: Buffer): ApiCommandError | undefined { try { const value = JSON.parse(bytes.toString()); if (value?.operation?.status !== "failed") return; const code = typeof value.error?.code === "string" ? value.error.code : "OPERATION_FAILED"; const message = typeof value.error?.message === "string" ? value.error.message : "Operation failed"; return new ApiCommandError(code, 70, message, JSON.stringify(value.error || { operation: value.operation })); } catch { return; } }

export async function executeApi(methodInput: string, endpoint: string, options: Record<string, unknown>) {
    const method = methodInput.toUpperCase(); if (!METHODS.has(method)) throw new ApiCommandError("USAGE", 1, `Unsupported API method: ${methodInput}`);
    let path = apiPath(endpoint); let profile: any; try { profile = dependencies.getProfile(); if (!profile || !validateVerser2Profile(profile)) throw new Error("missing"); } catch (error) { throw profileError(error); }
    path = validateTarget(profile, options, path); if (options.output !== undefined && !["json", "text", "raw"].includes(String(options.output))) throw new ApiCommandError("USAGE", 1, "--output must be json, text, or raw"); const query = apiPairs(options.query as string[], "=", "query"); const requestedHeaders = apiHeaders(options.header as string[]);
    await confirmation(method, options); const body = prepareBody(options, dependencies.stdin); if ((method === "GET" || method === "HEAD") && body.body) { body.destroy(); throw new ApiCommandError("USAGE", 1, `${method} does not accept a body`); }
    const controller = new AbortController(); const interrupt = () => controller.abort(); process.once("SIGINT", interrupt); let session: Awaited<ReturnType<typeof createVerifiedVerser2Session>> | undefined; let response: ApiBrokerResponse | undefined;
    try {
        const timeout = Number(options.timeout) || profile.timeoutMs;
        // Raw commands deliberately retain byte-for-byte response semantics,
        // but share the authenticated, verified broker session used by typed
        // commands instead of reproducing identity and close handling.
        session = await createVerifiedVerser2Session(profile, controller.signal, timeout);
        const headers = { ...requestedHeaders }; if (body.defaultContentType && headers["content-type"] === undefined) headers["content-type"] = body.defaultContentType;
        // Treat the raw response as an upstream route so the shared managed
        // client retains its byte stream while applying the same redirect,
        // deadline, late-response, and cleanup traversal as typed commands.
        response = await session.client.request({ route: { method: method.toLowerCase(), fullPath: path, kind: "upstream" } as any, query, headers, body: body.body, timeoutMs: timeout, signal: controller.signal }) as ApiBrokerResponse; const bytes = options.stream && response.status >= 200 && response.status < 300 ? undefined : await collect(response.body, controller.signal, timeout);
        if (response.status < 200 || response.status >= 300) throw new ApiCommandError(response.status < 500 ? "API_4XX" : "API_5XX", response.status < 500 ? 70 : 71, `API returned ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`, bytes?.toString("utf8"));
        if (bytes) { const operationError = failedOperationError(bytes); if (operationError) throw operationError; }
        if (method === "HEAD") { const headers = response.headerPairs?.map(([key, value]) => `${key}: ${value}`) || Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`); const output = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}\n${headers.join("\n")}\n`; if (options.outputFile) await fsWrite(String(options.outputFile), output); else dependencies.stdout.write(output); }
        else if (options.stream) await pipeResponse(await streamingBody(response, controller.signal, timeout), options.outputFile ? createWriteStream(String(options.outputFile)) : dependencies.stdout, controller.signal, timeout);
        else { let output: string | Buffer; try { output = options.output === "json" ? `${JSON.stringify(JSON.parse(bytes!.toString()), null, 2)}\n` : options.output === "text" ? bytes!.toString() : bytes!; } catch { throw new ApiCommandError("RESPONSE", 1, "Response is not valid JSON"); } if (options.outputFile) await fsWrite(String(options.outputFile), output); else dependencies.stdout.write(output); }
    } catch (error) { throw mapApiError(error); } finally { process.removeListener("SIGINT", interrupt); body.destroy(); if (response) await response.cleanup().catch(() => {}); await session?.close().catch(() => {}); }
}
function apiMethodCommand(method: string): CommandDescriptor {
    return cmd(method.toLowerCase(), b => b.argument("<path>").option("--space-id <id>", "Descendant space target").option("--hub-id <id>", "Descendant hub target").option("--query <key=value>", "Query parameter", "string[]").option("-H, --header <name:value>", "Request header", "string[]").option("--json <json>", "JSON request body").option("--file <path>", "Binary request body").option("--stdin", "Read request body from stdin").option("--binary <base64>", "Base64 request body").option("--timeout <ms>", "Request timeout", "number").option("--output <mode>", "json, text, or raw").option("--stream", "Stream response").option("-o, --output-file <path>", "Write response to file").option("--no-confirm", "Skip destructive request confirmation").action((path: string, options: Record<string, unknown>) => executeApi(method, path, options)));
}
export const apiCommand: CommandDescriptor = cmd("api", b => b.usage("<method> <path> [options]").desc("Call a v2 API through the selected Verser2 profile").children(
    ...[...METHODS].map(apiMethodCommand),
    cmd("endpoints", c => c.desc("List API endpoint inventory (unavailable through direct Verser2 access)").option("--space-id <id>", "Descendant space target").option("--hub-id <id>", "Descendant hub target").option("--instance-id <id>", "Descendant instance target").option("--format <openapi|markdown>", "Endpoint inventory format").action(() => { throw new ApiCommandError("UNAVAILABLE", 80, "API endpoint inventory is unavailable through direct Verser2 access"); }))
));
