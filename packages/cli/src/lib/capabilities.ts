import { Readable } from "stream";
import { createRestAPI2Client, RestAPI2Routes } from "@scramjet/rest-api2";
import type { RouteManifest, RouteManifestEntry } from "@scramjet/api-router";
import { createVerifiedVerser2Session, createVerser2CliTransport, mapApiError } from "./commands/api";
import { ApiCommandError } from "./apiCommandError";
import { profileManager, sessionConfig } from "./config";
import { validateVerser2Profile } from "./config/verser2Profile";

type Scope = "hub" | "space";
type Owner = "hub" | "space" | "root";
type Dependencies = { getProfile(): any; createTransport: typeof createVerser2CliTransport };
const productionDependencies: Dependencies = { getProfile: () => profileManager.getProfileConfig().get().verser2, createTransport: createVerser2CliTransport };
let dependencies = productionDependencies;

export class CapabilityUnavailableError extends ApiCommandError {
    constructor(operation: string) {
        super("UNAVAILABLE", 80, `${operation} is unavailable through direct Verser2 access`);
    }
}
export function setCapabilityDependencies(overrides?: Partial<Dependencies>) {
    dependencies = overrides ? { ...productionDependencies, ...overrides } : productionDependencies;
}

export type NativeCapabilities = {
    readonly kind: "verser2";
    json<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T>;
    managerJson<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>, query?: Record<string, unknown>, spaceId?: string): Promise<T>;
    rootJson<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T>;
    spaceJson<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>, spaceId?: string): Promise<T>;
    upload<T>(method: string, path: string, body: Readable, contentType?: string, headers?: Record<string, string>, owner?: "hub" | "manager"): Promise<T>;
    stream(path: string, owner?: "hub" | "manager"): Promise<Readable>;
    rootStream(path: string): Promise<Readable>;
    spaceStream(path: string, spaceId?: string): Promise<Readable>;
    topicPath(scope: Scope, suffix: string): string;
};

function selectedProfile() {
    const profile = dependencies.getProfile();
    if (!profile) return undefined;
    if (!validateVerser2Profile(profile)) throw new ApiCommandError("PROFILE", 61, "Invalid Verser2 profile");
    return profile;
}
function encoded(value: string) {
    return encodeURIComponent(value);
}
function selectedSpace(profile: any, explicitSpaceId?: string) {
    return explicitSpaceId || sessionConfig.lastSpaceId || profile.target?.spaceId;
}
function pathFor(profile: any, path: string, owner: Owner, explicitSpaceId?: string) {
    if (!path.startsWith("/api/v2/")) throw new ApiCommandError("USAGE", 1, "Named v2 path must be absolute");
    const suffix = path.slice("/api/v2".length);
    const target = profile.target;
    if (profile.ingress.level === "hub") {
        if (owner !== "hub") throw new CapabilityUnavailableError(`${owner === "space" ? "Manager" : "Root"} operation`);
        if (target) throw new ApiCommandError("TARGET", 54, "Direct Hub ingress has no descendant target");
        return path;
    }
    if (owner === "root") return path;
    const spaceId = selectedSpace(profile, explicitSpaceId);
    if (owner === "space") {
        if (profile.ingress.level === "space") {
            // A space ingress is fixed to its authenticated Manager.  Do not
            // silently ignore an explicit or remembered selection for another
            // Manager, as that would make the displayed target misleading.
            if (spaceId && spaceId !== profile.ingress.expectedId) throw new ApiCommandError("TARGET", 54, "Selected Space contradicts the fixed space ingress");
            return path;
        }
        if (!spaceId) throw new ApiCommandError("TARGET", 54, "Space-owned commands require a Space target");
        return `/api/v2/spaces/${encoded(spaceId)}${suffix}`;
    }
    // An explicit interactive selection is authoritative for all Hub-owned leaves.
    const hubId = owner === "hub" ? sessionConfig.lastHubId || target?.hubId : undefined;
    if (owner === "hub" && !hubId) throw new ApiCommandError("TARGET", 54, "Hub-owned commands require a Hub target");
    if (profile.ingress.level === "space") return `/api/v2/hubs/${encoded(hubId)}${suffix}`;
    if (!spaceId) throw new ApiCommandError("TARGET", 54, "Hub-owned commands require a Space target");
    return `/api/v2/spaces/${encoded(spaceId)}/hubs/${encoded(hubId)}${suffix}`;
}
function manifestFor(profile: any): RouteManifest {
    const basePath = "/api/v2";
    if (profile.ingress.level === "hub") return RestAPI2Routes.hub.router(basePath).collect({ expandResolvers: true });
    if (profile.ingress.level === "space") return RestAPI2Routes.space.router(basePath).collect({ expandResolvers: true });
    return RestAPI2Routes.root.router(basePath).collect({ expandResolvers: true });
}
function contractFor(manifest: RouteManifest, method: string, path: string): { route: RouteManifestEntry; params: Record<string, string> } {
    const actual = path.split("?")[0].split("/").filter(Boolean);
    for (const route of manifest.routes) {
        if (route.method !== method.toLowerCase() && route.method !== method.toUpperCase()) continue;
        const expected = route.fullPath.split("/").filter(Boolean);
        if (actual.length !== expected.length) continue;
        const params: Record<string, string> = {};
        let matches = true;
        for (let index = 0; index < expected.length; index++) {
            const part = expected[index];
            if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(actual[index]);
            else if (part !== actual[index]) { matches = false; break; }
        }
        if (matches) return { route, params };
    }
    throw new CapabilityUnavailableError(`Named v2 contract for ${method} ${path}`);
}
function topicPathFor(profile: any, scope: Scope, suffix: string) {
    if (scope === "space") {
        if (profile.ingress.level === "hub") throw new ApiCommandError("TARGET", 54, "Selected ingress cannot address space topics");
        return `/api/v2${suffix}`;
    }
    if (profile.ingress.level === "hub") return `/api/v2${suffix}`;
    const hubId = sessionConfig.lastHubId || profile.target?.hubId;
    if (profile.ingress.level === "space" && hubId) return `/api/v2${suffix}`;
    if (profile.ingress.level === "platform" && selectedSpace(profile) && hubId) return `/api/v2${suffix}`;
    throw new ApiCommandError("TARGET", 54, "Hub topic commands require a Hub target");
}
function failedOperationError(value: unknown): ApiCommandError | undefined {
    if (!value || typeof value !== "object") return undefined;
    const response = value as { operation?: { id?: unknown; status?: unknown }; error?: { code?: unknown; message?: unknown; details?: unknown } };
    if (response.operation?.status !== "failed") return undefined;
    const code = typeof response.error?.code === "string" && response.error.code ? response.error.code : "OPERATION_FAILED";
    const id = typeof response.operation.id === "string" && response.operation.id ? ` (${response.operation.id})` : "";
    const message = typeof response.error?.message === "string" && response.error.message ? response.error.message : `Operation${id} failed`;
    return new ApiCommandError(code, 70, message, JSON.stringify(response.error || { operation: response.operation }));
}
/**
 * V2 upstream routes may return a JSON operation failure in place of a stream.
 * Inspect only until a complete JSON value is available, then preserve the
 * original byte stream for ordinary stream responses.
 */
async function inspectNamedStream(source: Readable, headers: Record<string, string>, controller: AbortController, timeoutMs?: number): Promise<Readable> {
    if (!String(headers["content-type"] || "").toLowerCase().includes("application/json")) return source;
    const iterator = source[Symbol.asyncIterator]();
    const chunks: Buffer[] = [];
    let rejectInterruption!: (error: ApiCommandError) => void;
    let interruption: ApiCommandError | undefined;
    const interrupted = new Promise<never>((_, reject) => { rejectInterruption = reject; });
    const stop = (error: ApiCommandError) => {
        interruption ||= error;
        if (!source.destroyed) source.destroy(interruption);
        rejectInterruption(interruption);
    };
    const onAbort = () => stop(new ApiCommandError("CANCELLED", 60, "Request cancelled"));
    const timer = timeoutMs ? setTimeout(() => stop(new ApiCommandError("TIMEOUT", 57, "Request timed out")), timeoutMs) : undefined;
    controller.signal.addEventListener("abort", onAbort, { once: true });
    try {
        for (;;) {
            const next = await Promise.race([iterator.next(), interrupted]);
            if (next.done) break;
            chunks.push(Buffer.from(next.value));
            try {
                const value = JSON.parse(Buffer.concat(chunks).toString());
                const error = failedOperationError(value);
                if (error) throw error;
                break;
            } catch (error) {
                if (error instanceof ApiCommandError) throw error;
            }
        }
    } catch (error) {
        if (interruption) throw interruption;
        throw error;
    } finally {
        controller.signal.removeEventListener("abort", onAbort);
        if (timer) clearTimeout(timer);
    }
    return Readable.from((async function*() {
        yield* chunks;
        for await (const chunk of { [Symbol.asyncIterator]: () => iterator } as AsyncIterable<Buffer>) yield chunk;
    })());
}
function splitPathQuery(path: string): { path: string; query?: Record<string, string | string[]> } {
    const index = path.indexOf("?");
    if (index === -1) return { path };
    const query: Record<string, string | string[]> = {};
    for (const [key, value] of new URLSearchParams(path.slice(index + 1))) {
        const current = query[key];
        query[key] = current === undefined ? value : Array.isArray(current) ? [...current, value] : [current, value];
    }
    return { path: path.slice(0, index), query };
}
async function call<T>(method: string, requestedPath: string, body?: readonly Buffer[] | Readable, headers: Record<string, string> = {}, streaming = false, owner: Owner = "hub", explicitSpaceId?: string, query?: Record<string, unknown>): Promise<T | Readable> {
    const profile = selectedProfile();
    if (!profile) throw new CapabilityUnavailableError("Named v2 command");
    const requested = splitPathQuery(requestedPath);
    const path = pathFor(profile, requested.path, owner, explicitSpaceId);
    const manifest = manifestFor(profile);
    const contract = contractFor(manifest, method, path);
    const controller = new AbortController();
    let session: Awaited<ReturnType<typeof createVerifiedVerser2Session>> | undefined;
    let handedOff = false;
    const abort = () => {
        process.removeListener("SIGINT", abort);
        controller.abort();
    };
    process.once("SIGINT", abort);
    try {
        session = await createVerifiedVerser2Session(profile, controller.signal, profile.timeoutMs, dependencies.createTransport(profile, controller.signal));
        const client = createRestAPI2Client({ manifest, transport: session.client });
        const response = await client.request<any>({ operationId: contract.route.id as any, params: contract.params, query: query || requested.query, headers, body, timeoutMs: profile.timeoutMs, signal: controller.signal });
        if (response.status < 200 || response.status >= 300) {
            await session.close();
            throw new ApiCommandError(response.status < 500 ? "API_4XX" : "API_5XX", response.status < 500 ? 70 : 71, `API returned ${response.status}`, typeof response.body === "string" ? response.body : undefined);
        }
        if (streaming) {
            const output = await inspectNamedStream(response.body as Readable, response.headers, controller, profile.timeoutMs) as Readable & { cleanup?: () => Promise<void> };
            let cleanupResult: Promise<void> | undefined;
            let timer: NodeJS.Timeout | undefined;
            const cleanup = () => cleanupResult ||= (async () => {
                if (timer) clearTimeout(timer);
                await response.cleanup?.();
                await session!.close();
            })();
            const interrupt = (error?: ApiCommandError) => {
                // EventEmitter passes the signal name to SIGINT listeners; it is
                // not a terminal error and must not replace the mapped one.
                const terminal = error instanceof ApiCommandError ? error : new ApiCommandError("CANCELLED", 60, "Request cancelled");
                if (!output.destroyed) output.destroy(terminal);
                if (!response.body.destroyed) (response.body as unknown as Readable).destroy(terminal);
                void cleanup();
            };
            process.removeListener("SIGINT", abort);
            process.on("SIGINT", interrupt);
            output.cleanup = cleanup;
            output.once("end", () => { process.removeListener("SIGINT", interrupt); void cleanup(); });
            output.once("error", () => { process.removeListener("SIGINT", interrupt); void cleanup(); });
            output.once("close", () => { process.removeListener("SIGINT", interrupt); void cleanup(); });
            if (profile.timeoutMs) timer = setTimeout(() => interrupt(new ApiCommandError("TIMEOUT", 57, "Request timed out")), profile.timeoutMs);
            handedOff = true;
            return output;
        }
        await session.close();
        const value = typeof response.body === "string" ? JSON.parse(response.body || "{}") : response.body;
        const error = failedOperationError(value);
        if (error) throw error;
        return value as T;
    } catch (error) {
        if (body instanceof Readable && !body.destroyed) body.destroy(error as Error);
        throw mapApiError(error);
    } finally {
        process.removeListener("SIGINT", abort);
        if (!handedOff) await session?.close().catch(() => {});
    }
}

export function getNativeCapabilities(): NativeCapabilities | undefined {
    const profile = selectedProfile();
    if (!profile) return undefined;
    return {
        kind: "verser2",
        json: (method, path, body, headers = {}) =>
            call(
                method,
                path,
                body === undefined ? undefined : [Buffer.from(JSON.stringify(body))],
                body === undefined ? headers : { "content-type": "application/json", ...headers }
            ) as Promise<any>,
        managerJson: (method, path, body, headers = {}, query, spaceId) =>
            call(
                method,
                path,
                body === undefined ? undefined : [Buffer.from(JSON.stringify(body))],
                body === undefined ? headers : { "content-type": "application/json", ...headers },
                false,
                "space",
                spaceId,
                query
            ) as Promise<any>,
        rootJson: (method, path, body, headers = {}) =>
            call(method, path, body === undefined ? undefined : [Buffer.from(JSON.stringify(body))], body === undefined ? headers : { "content-type": "application/json", ...headers }, false, "root") as Promise<any>,
        spaceJson: (method, path, body, headers = {}, spaceId) =>
            call(method, path, body === undefined ? undefined : [Buffer.from(JSON.stringify(body))], body === undefined ? headers : { "content-type": "application/json", ...headers }, false, "space", spaceId) as Promise<any>,
        upload: (method, path, body, contentType = "application/octet-stream", headers = {}, owner = "hub") =>
            call(method, path, body, { "content-type": contentType, ...headers }, false, owner === "manager" ? "space" : owner) as Promise<any>,
        stream: (path, owner = "hub") => call("GET", path, undefined, {}, true, owner === "manager" ? "space" : owner) as Promise<Readable>,
        rootStream: path => call("GET", path, undefined, {}, true, "root") as Promise<Readable>,
        spaceStream: (path, spaceId) => call("GET", path, undefined, {}, true, "space", spaceId) as Promise<Readable>,
        topicPath: (scope, suffix) => topicPathFor(profile, scope, suffix)
    };
}
