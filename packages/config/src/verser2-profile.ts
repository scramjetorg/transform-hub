import { isAbsolute } from "path";

export type OutboundVerser2IngressLevel = "platform" | "space" | "hub";
export interface OutboundVerser2ProfileConfig { endpoint: string; brokerId: string; ingress: { level: OutboundVerser2IngressLevel; expectedId: string; routeDomain: string }; target?: { spaceId?: string; hubId?: string }; tls: { caFile: string; certFile?: string; keyFile?: string; pfxFile?: string; passphraseReference?: string }; timeoutMs?: number; }
export interface OutboundVerser2ProfileDraft { endpoint?: string; brokerId?: string; ingress?: Partial<OutboundVerser2ProfileConfig["ingress"]>; target?: { spaceId?: string; hubId?: string }; tls?: Partial<OutboundVerser2ProfileConfig["tls"]>; timeoutMs?: number; }
const envReference = /^env:\/\/[A-Za-z_][A-Za-z0-9_]*$/;
const keys = (value: unknown, allowed: readonly string[]) => typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key));
const file = (value: unknown) => typeof value === "string" && isAbsolute(value) && !value.includes("://");
const id = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9._-]+$/.test(value);
export function validateOutboundVerser2Profile(value: unknown): value is OutboundVerser2ProfileConfig {
    if (!keys(value, ["endpoint", "brokerId", "ingress", "target", "tls", "timeoutMs"])) return false;
    const config = value as OutboundVerser2ProfileConfig;
    if (typeof config.endpoint !== "string") return false;
    try { const url = new URL(config.endpoint); if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return false; } catch (_) { return false; }
    if (!id(config.brokerId) || !keys(config.ingress, ["level", "expectedId", "routeDomain"]) || !["platform", "space", "hub"].includes(config.ingress.level) || !id(config.ingress.expectedId) || !id(config.ingress.routeDomain)) return false;
    if (config.target !== undefined && (!keys(config.target, ["spaceId", "hubId"]) || !Object.keys(config.target).length || Object.values(config.target).some(value => value !== undefined && !id(value)))) return false;
    if (config.ingress.level === "platform" && config.target?.hubId && !config.target.spaceId || config.ingress.level === "space" && (config.target?.spaceId || config.target && !config.target.hubId) || config.ingress.level === "hub" && config.target) return false;
    if (!keys(config.tls, ["caFile", "certFile", "keyFile", "pfxFile", "passphraseReference"]) || !file(config.tls.caFile)) return false;
    // At most one client-identity pair is allowed.  Neither pair is required
    // when the target ingress does not enforce mTLS.
    const noIdentity = config.tls.certFile === undefined && config.tls.keyFile === undefined && config.tls.pfxFile === undefined;
    const pemIdentity = file(config.tls.certFile) && file(config.tls.keyFile) && config.tls.pfxFile === undefined;
    const pfxIdentity = file(config.tls.pfxFile) && config.tls.certFile === undefined && config.tls.keyFile === undefined;
    if (!noIdentity && !pemIdentity && !pfxIdentity) return false;
    return (config.tls.passphraseReference === undefined || typeof config.tls.passphraseReference === "string" && (envReference.test(config.tls.passphraseReference) || file(config.tls.passphraseReference))) && (config.timeoutMs === undefined || Number.isFinite(config.timeoutMs) && config.timeoutMs > 0);
}
export function validateOutboundVerser2Draft(value: unknown): value is OutboundVerser2ProfileDraft {
    if (!keys(value, ["endpoint", "brokerId", "ingress", "target", "tls", "timeoutMs"])) return false;
    const draft = value as OutboundVerser2ProfileDraft;
    if (draft.endpoint !== undefined && (typeof draft.endpoint !== "string" || !validateOutboundVerser2Endpoint(draft.endpoint))) return false;
    if (draft.brokerId !== undefined && !id(draft.brokerId)) return false;
    if (draft.ingress !== undefined && (!keys(draft.ingress, ["level", "expectedId", "routeDomain"]) || draft.ingress.level !== undefined && !["platform", "space", "hub"].includes(draft.ingress.level) || draft.ingress.expectedId !== undefined && !id(draft.ingress.expectedId) || draft.ingress.routeDomain !== undefined && !id(draft.ingress.routeDomain))) return false;
    if (draft.target !== undefined && (!keys(draft.target, ["spaceId", "hubId"]) || !Object.keys(draft.target).length || !Object.values(draft.target).every(id) || draft.ingress?.level === "hub" || draft.ingress?.level === "space" && draft.target.spaceId || draft.target.hubId && !draft.target.spaceId && draft.ingress?.level !== "space")) return false;
    if (draft.tls !== undefined && (!keys(draft.tls, ["caFile", "certFile", "keyFile", "pfxFile", "passphraseReference"]) || Object.entries(draft.tls).some(([key, item]) => key === "passphraseReference" ? typeof item !== "string" || !(envReference.test(item) || file(item)) : item !== undefined && !file(item)))) return false;
    return draft.timeoutMs === undefined || typeof draft.timeoutMs === "number" && Number.isFinite(draft.timeoutMs) && draft.timeoutMs > 0;
}
function validateOutboundVerser2Endpoint(endpoint: string): boolean { try { const url = new URL(endpoint); return url.protocol === "https:" && !!url.hostname && !url.username && !url.password; } catch (_) { return false; } }
export function publicOutboundVerser2Profile(config: unknown): Partial<OutboundVerser2ProfileConfig> { if (!validateOutboundVerser2Profile(config)) return {}; return { endpoint: config.endpoint, brokerId: config.brokerId, ingress: { ...config.ingress }, target: config.target && { ...config.target }, tls: { caFile: config.tls.caFile, certFile: config.tls.certFile, ...(config.tls.keyFile ? { keyFile: "********" } : {}), ...(config.tls.pfxFile ? { pfxFile: "********" } : {}), ...(config.tls.passphraseReference ? { passphraseReference: "********" } : {}) }, timeoutMs: config.timeoutMs }; }
