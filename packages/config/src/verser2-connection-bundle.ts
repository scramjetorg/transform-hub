import { X509Certificate } from "crypto";
import { isAbsolute } from "path";
import type { OutboundVerser2IngressLevel, OutboundVerser2ProfileConfig } from "./verser2-profile";

export interface Verser2ConnectionBundle {
    kind: "scramjet.connection-bundle"; version: 1; profileName: string; transport: "verser2";
    publicEndpoint: { url: string; port: number; role: "control" };
    brokerId: string;
    ingress: { level: OutboundVerser2IngressLevel; expectedId: string; routeDomain: string };
    target?: { spaceId?: string; hubId?: string };
    trust: { caPem: string; sha256Fingerprint: string; expiresAt: string };
    credentials?: { certFile: string; keyFile: string; passphraseReference?: string } | { pfxFile: string; passphraseReference?: string };
}

const ownKeys = (v: unknown, allowed: readonly string[]) => typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k));
const id = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9._-]+$/.test(v);
const ref = (v: unknown) => typeof v === "string" && (isAbsolute(v) && !v.includes("://") || /^env:\/\/[A-Za-z_][A-Za-z0-9_]*$/.test(v));
const fingerprint = (v: string) => v.replace(/:/g, "").toUpperCase();

function certificate(pem: string): X509Certificate | undefined {
    const blocks = pem.match(/-----BEGIN ([^-]+)-----[\s\S]*?-----END \1-----/g) || [];
    if (!blocks.length || blocks.some(block => !block.startsWith("-----BEGIN CERTIFICATE-----"))) return undefined;
    try { return blocks.length === 1 ? new X509Certificate(blocks[0]) : undefined; } catch (_) { return undefined; }
}
function validShape(v: unknown): v is Verser2ConnectionBundle {
    if (!ownKeys(v, ["kind", "version", "profileName", "transport", "publicEndpoint", "brokerId", "ingress", "target", "trust", "credentials"])) return false;
    const b = v as Verser2ConnectionBundle;
    if (b.kind !== "scramjet.connection-bundle" || b.version !== 1 || b.transport !== "verser2" || !id(b.profileName) || !id(b.brokerId)) return false;
    if (!ownKeys(b.publicEndpoint, ["url", "port", "role"]) || b.publicEndpoint.role !== "control" || !Number.isInteger(b.publicEndpoint.port) || b.publicEndpoint.port < 1 || b.publicEndpoint.port > 65535) return false;
    try { const u = new URL(b.publicEndpoint.url); const urlPort = u.port ? Number(u.port) : 443; if (u.protocol !== "https:" || urlPort !== b.publicEndpoint.port || u.username || u.password) return false; } catch (_) { return false; }
    if (!ownKeys(b.ingress, ["level", "expectedId", "routeDomain"]) || !["platform", "space", "hub"].includes(b.ingress.level) || !id(b.ingress.expectedId) || !id(b.ingress.routeDomain)) return false;
    if (b.target !== undefined && (!ownKeys(b.target, ["spaceId", "hubId"]) || !Object.keys(b.target).length || Object.values(b.target).some(x => x !== undefined && !id(x)))) return false;
    if (b.ingress.level === "hub" && b.target || b.ingress.level === "space" && (!b.target || b.target.spaceId || !b.target.hubId) || b.ingress.level === "platform" && b.target?.hubId && !b.target.spaceId) return false;
    if (!ownKeys(b.trust, ["caPem", "sha256Fingerprint", "expiresAt"]) || typeof b.trust.caPem !== "string" || typeof b.trust.sha256Fingerprint !== "string" || !/^[0-9A-Fa-f]{64}$/.test(fingerprint(b.trust.sha256Fingerprint))) return false;
    const cert = certificate(b.trust.caPem); if (!cert) return false;
    if (fingerprint(cert.fingerprint256) !== fingerprint(b.trust.sha256Fingerprint)) return false;
    const expiry = Date.parse(b.trust.expiresAt); if (!Number.isFinite(expiry) || expiry <= Date.now() || Date.parse(cert.validTo) !== expiry) return false;
    if (b.credentials !== undefined) {
        if (!ownKeys(b.credentials, ["certFile", "keyFile", "pfxFile", "passphraseReference"])) return false;
        const c = b.credentials as Record<string, unknown>;
        if (c.certFile !== undefined || c.keyFile !== undefined) { if (!ref(c.certFile) || !ref(c.keyFile) || c.pfxFile !== undefined) return false; }
        else if (!ref(c.pfxFile) || c.certFile !== undefined || c.keyFile !== undefined) return false;
        if (c.passphraseReference !== undefined && !ref(c.passphraseReference)) return false;
    }
    return true;
}

export function validateVerser2ConnectionBundle(value: unknown): value is Verser2ConnectionBundle { return validShape(value); }
export function decodeVerser2ConnectionBundle(value: string | unknown): Verser2ConnectionBundle { let parsed: unknown; try { parsed = typeof value === "string" ? JSON.parse(value) : value; } catch (_) { throw new Error("Invalid Verser2 connection bundle JSON"); } if (!validShape(parsed)) throw new Error("Invalid Verser2 connection bundle"); return parsed; }
export function encodeVerser2ConnectionBundle(value: Verser2ConnectionBundle): string { decodeVerser2ConnectionBundle(value); return JSON.stringify(value); }
export function publicVerser2ConnectionBundle(value: unknown): Partial<Verser2ConnectionBundle> { if (!validShape(value)) return {}; const b = value as Verser2ConnectionBundle; return { ...b, trust: { ...b.trust, caPem: "********" }, ...(b.credentials ? { credentials: Object.fromEntries(Object.keys(b.credentials).map(k => [k, "********"])) as Verser2ConnectionBundle["credentials"] } : {}) }; }
export const redactVerser2ConnectionBundle = publicVerser2ConnectionBundle;
export const validateConnectionBundle = validateVerser2ConnectionBundle;
export const decodeConnectionBundle = decodeVerser2ConnectionBundle;
export const encodeConnectionBundle = encodeVerser2ConnectionBundle;
export const publicConnectionBundle = publicVerser2ConnectionBundle;

export function compileVerser2ConnectionBundle(bundle: Verser2ConnectionBundle, caFile: string): OutboundVerser2ProfileConfig {
    const b = decodeVerser2ConnectionBundle(bundle); if (!isAbsolute(caFile) || caFile.includes("://")) throw new Error("CA materialization path must be a local absolute path");
    const tls = b.credentials && ("certFile" in b.credentials ? { certFile: b.credentials.certFile, keyFile: b.credentials.keyFile, ...(b.credentials.passphraseReference ? { passphraseReference: b.credentials.passphraseReference } : {}) } : { pfxFile: b.credentials.pfxFile, ...(b.credentials.passphraseReference ? { passphraseReference: b.credentials.passphraseReference } : {}) });
    return { endpoint: b.publicEndpoint.url, brokerId: b.brokerId, ingress: { ...b.ingress }, ...(b.target ? { target: { ...b.target } } : {}), tls: { caFile, ...(tls || {}) } };
}
export const compileVerser2Profile = compileVerser2ConnectionBundle;
export const connectionBundleFingerprint = (pem: string): string => fingerprint(new X509Certificate(pem).fingerprint256);
