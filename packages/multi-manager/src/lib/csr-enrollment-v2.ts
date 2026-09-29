import { createHash, X509Certificate } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
    canonicalCsrEnrollmentRegistrations,
    canonicalizeCsrEnrollmentRegistrations,
    csrEnrollmentRegistrationsToDnsSans,
    csrEnrollmentClaimDigest,
    csrEnrollmentClaimUriSan,
    type CsrEnrollmentClaim,
    type CsrEnrollmentRegistration,
    type CsrEnrollmentPrincipal
} from "@scramjet/runtime-types";
import { csrEnrollmentRecordFilename, normalizeCsrEnrollmentFilenamePart } from "@scramjet/manager";

export { csrEnrollmentRecordFilename, normalizeCsrEnrollmentFilenamePart } from "@scramjet/manager";

export type CsrCertificateEvidence = {
    fingerprint256: string;
    serialNumber: string;
    san: readonly string[];
    registrations: readonly CsrEnrollmentRegistration[];
    role?: CsrEnrollmentRegistration["role"];
    peerId?: string;
    routedDomains?: readonly string[];
    local?: boolean;
    claim?: CsrEnrollmentClaim;
    raw?: string | Buffer;
};

export type CsrAuthorizerPolicy = {
    allowed: ReadonlyArray<CsrEnrollmentRegistration>;
    legacy?: (certificate: CsrCertificateEvidence) => boolean;
};

export type CsrAuthorizationResult = { allowed: true; reason: "issued" | "legacy"; authorizationContext?: { principal: string; claim?: CsrEnrollmentClaim; certificateFingerprint256: string } } | { allowed: false; reason: string };

export function fingerprint256(value: string | Buffer): string {
    return createHash("sha256").update(value).digest("hex");
}

function normalizedFingerprint(value: string): string {
    return value.replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase();
}

export function certificateSerialNumber(rawBase64: string | undefined): string {
    if (!rawBase64) return "";
    try { return new X509Certificate(Buffer.from(rawBase64, "base64")).serialNumber; } catch { return ""; }
}

export interface CsrEnrollmentIssuedRecord {
    version: "csr/v2";
    principal: CsrEnrollmentPrincipal;
    registrations: readonly CsrEnrollmentRegistration[];
    certificateFingerprint256: string;
    certificateSerialNumber: string;
    san: readonly string[];
    issuedAt: string;
    expiresAt: string;
    active: boolean;
    claim?: CsrEnrollmentClaim;
    claimDigest?: string;
}

/** Read-only view of Manager-owned issuance records. MultiManager never receives a CA key. */
export class CsrEnrollmentStore {
    constructor(private readonly storageDir: string) {}

    getIssued(fingerprint: string, serial: string): CsrEnrollmentIssuedRecord | undefined {
        const safeFingerprint = normalizeCsrEnrollmentFilenamePart(fingerprint);
        const safeSerial = normalizeCsrEnrollmentFilenamePart(serial);
        if (!safeFingerprint || !safeSerial) return undefined;
        const canonicalFile = join(this.storageDir, csrEnrollmentRecordFilename(fingerprint, serial));
        const legacyFile = join(this.storageDir, `${fingerprint}-${serial}.json`);
        for (const file of new Set([canonicalFile, legacyFile])) {
            if (!existsSync(file)) continue;
            try { return JSON.parse(readFileSync(file, "utf8")) as CsrEnrollmentIssuedRecord; } catch { return undefined; }
        }
        return undefined;
    }
}

export function authorizeCsrEnrollment(certificate: CsrCertificateEvidence, policy: CsrAuthorizerPolicy, issued: CsrEnrollmentStore, now = new Date()): CsrAuthorizationResult {
    const record = issued.getIssued(normalizedFingerprint(certificate.fingerprint256), certificate.serialNumber);
    if (!record) {
        const fingerprint = normalizeCsrEnrollmentFilenamePart(certificate.fingerprint256);
        const serial = normalizeCsrEnrollmentFilenamePart(certificate.serialNumber);
        return policy.legacy?.(certificate) ? { allowed: true, reason: "legacy" } : { allowed: false, reason: `v2 certificate was not issued (fingerprint=${fingerprint}, serial=${serial}, record=absent)` };
    }
    if (!record.active || Date.parse(record.expiresAt) <= now.getTime()) return { allowed: false, reason: "v2 certificate is inactive or expired" };
    if (normalizedFingerprint(record.certificateFingerprint256) !== normalizedFingerprint(certificate.fingerprint256) || record.certificateSerialNumber.toLowerCase() !== certificate.serialNumber.toLowerCase()) return { allowed: false, reason: "certificate identity mismatch" };
    if (certificate.raw) {
        const raw = typeof certificate.raw === "string" && !certificate.raw.includes("BEGIN") ? Buffer.from(certificate.raw, "base64") : certificate.raw;
        if (fingerprint256(new X509Certificate(raw).raw).toLowerCase() !== normalizedFingerprint(certificate.fingerprint256)) return { allowed: false, reason: "presented certificate fingerprint mismatch" };
    }
    const registrations = certificate.registrations.length ? certificate.registrations : certificate.role && certificate.peerId ? [{ principal: record.principal, role: certificate.role, peerId: certificate.peerId, routedDomains: certificate.routedDomains || [] }] : [];
    if (canonicalCsrEnrollmentRegistrations(record.registrations) !== canonicalCsrEnrollmentRegistrations(registrations)) return { allowed: false, reason: "registration set mismatch" };
    const expectedSan = [
        ...csrEnrollmentRegistrationsToDnsSans(record.registrations),
        ...(record.claim ? [csrEnrollmentClaimUriSan(record.claim, csrEnrollmentClaimDigest(record.claim))] : [])
    ];
    if (expectedSan.length !== certificate.san.length || expectedSan.some((name, index) => name !== certificate.san[index])) return { allowed: false, reason: "certificate SAN mismatch" };
    if (record.claim) {
        if (!certificate.claim || canonicalClaim(record.claim) !== canonicalClaim(certificate.claim)) return { allowed: false, reason: "certificate claim mismatch" };
        const digest = csrEnrollmentClaimDigest(record.claim);
        if (record.claimDigest !== digest || !certificate.san.includes(csrEnrollmentClaimUriSan(record.claim, digest))) return { allowed: false, reason: "certificate claim URI-SAN mismatch" };
    }
    if (!record.registrations.every(registration => policy.allowed.some(entry => canonicalCsrEnrollmentRegistrations([entry]) === canonicalCsrEnrollmentRegistrations([registration])))) return { allowed: false, reason: "registration tuple denied by policy" };
    return record.claim
        ? { allowed: true, reason: "issued", authorizationContext: { principal: `${record.principal}:${record.claim.realm}:${record.claim.space}:${record.claim.hub}`, claim: record.claim, certificateFingerprint256: record.certificateFingerprint256 } }
        : { allowed: true, reason: "issued" };
}

function canonicalClaim(claim: CsrEnrollmentClaim): string {
    return JSON.stringify({ realm: claim.realm, space: claim.space, hub: claim.hub, federationHost: claim.federationHost, broker: claim.broker, guestRoute: claim.guestRoute });
}

export function canonicalRegistrations(registrations: readonly CsrEnrollmentRegistration[]): readonly CsrEnrollmentRegistration[] {
    return canonicalizeCsrEnrollmentRegistrations(registrations);
}
