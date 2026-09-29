/** Runtime-neutral CSR enrollment protocol. Secret material is never part of these contracts. */
import { createHash } from "crypto";
export const CSR_ENROLLMENT_PROTOCOL_VERSION = "csr-enrollment/v1" as const;
export const CSR_ENROLLMENT_V2_PROTOCOL_VERSION = "csr/v2" as const;
export const CSR_ENROLLMENT_CLAIM_URI_PREFIX = "urn:scramjet:csr:v2:sha256:" as const;

export type CsrEnrollmentPrincipal = "sth" | "si";
export type CsrEnrollmentRole = "broker" | "guest";

/** The exact, binding-scoped transport authorization carried by an STH certificate. */
export interface CsrEnrollmentClaim {
    realm: string;
    space: string;
    hub: string;
    federationHost: string;
    broker: string;
    guestRoute: string;
}

function claimPart(value: string, name: string): string {
    if (typeof value !== "string" || value.length === 0 || value.trim() !== value || value.length > 512) throw new Error(`invalid csr/v2 ${name}`);
    return value;
}

export function canonicalizeCsrEnrollmentClaim(claim: CsrEnrollmentClaim): CsrEnrollmentClaim {
    if (!claim) throw new Error("invalid csr/v2 claim");
    return Object.freeze({
        realm: claimPart(claim.realm, "realm"), space: claimPart(claim.space, "space"), hub: claimPart(claim.hub, "hub"),
        federationHost: claimPart(claim.federationHost, "federationHost"), broker: claimPart(claim.broker, "broker"), guestRoute: claimPart(claim.guestRoute, "guestRoute")
    });
}

export function canonicalCsrEnrollmentClaim(claim: CsrEnrollmentClaim): string {
    const value = canonicalizeCsrEnrollmentClaim(claim);
    return JSON.stringify(value);
}

export function csrEnrollmentClaimDigest(claim: CsrEnrollmentClaim): string {
    return createHash("sha256").update(canonicalCsrEnrollmentClaim(claim), "utf8").digest("hex");
}

export function csrEnrollmentClaimUriSan(claim: CsrEnrollmentClaim, digest: string): string {
    canonicalizeCsrEnrollmentClaim(claim);
    if (!digest) digest = csrEnrollmentClaimDigest(claim);
    if (!/^[a-f0-9]{64}$/i.test(digest)) throw new Error("invalid csr/v2 claim digest");
    return `${CSR_ENROLLMENT_CLAIM_URI_PREFIX}${digest.toLowerCase()}`;
}

export function csrEnrollmentClaimUriSans(claim: CsrEnrollmentClaim, digest: string): readonly string[] {
    return [csrEnrollmentClaimUriSan(claim, digest)];
}

export interface CsrEnrollmentClaims {
    role: CsrEnrollmentRole;
    peerId: string;
    routedDomains: readonly string[];
}

export interface CsrEnrollmentRegistration {
    principal: CsrEnrollmentPrincipal;
    role: CsrEnrollmentRole;
    peerId: string;
    routedDomains: readonly string[];
}

/** Canonical, order-preserving representation used for certificate bindings. */
export function canonicalizeCsrEnrollmentClaims(claims: CsrEnrollmentClaims): CsrEnrollmentClaims {
    if (!claims || !["broker", "guest"].includes(claims.role) || !claims.peerId || !Array.isArray(claims.routedDomains)) throw new Error("invalid csr/v2 claims");
    if (claims.routedDomains.some(domain => !domain || domain.trim() !== domain) || new Set(claims.routedDomains).size !== claims.routedDomains.length) throw new Error("invalid csr/v2 routed domains");
    return Object.freeze({ role: claims.role, peerId: claims.peerId, routedDomains: Object.freeze([...claims.routedDomains]) });
}

export function canonicalCsrEnrollmentClaims(claims: CsrEnrollmentClaims): string {
    const value = canonicalizeCsrEnrollmentClaims(claims);
    return JSON.stringify({ role: value.role, peerId: value.peerId, routedDomains: [...value.routedDomains] });
}

export function csrEnrollmentClaimsToDnsSans(claims: CsrEnrollmentClaims): readonly string[] {
    const value = canonicalizeCsrEnrollmentClaims(claims);
    return [value.peerId, ...value.routedDomains];
}

export function csrEnrollmentSansMatchClaims(sans: readonly string[], claims: CsrEnrollmentClaims): boolean {
    const expected = csrEnrollmentClaimsToDnsSans(claims);
    return sans.length === expected.length && expected.every((name, index) => sans[index] === name);
}

export function canonicalizeCsrEnrollmentRegistrations(registrations: readonly CsrEnrollmentRegistration[]): readonly CsrEnrollmentRegistration[] {
    if (!Array.isArray(registrations) || registrations.length === 0) throw new Error("invalid csr/v2 registration set");
    const value = registrations.map(registration => {
        if (!registration || !["sth", "si"].includes(registration.principal)) throw new Error("invalid csr/v2 principal");
        canonicalizeCsrEnrollmentClaims(registration);
        return Object.freeze({
            principal: registration.principal,
            role: registration.role,
            peerId: registration.peerId,
            routedDomains: Object.freeze([...registration.routedDomains])
        });
    }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    if (new Set(value.map(registration => JSON.stringify(registration))).size !== value.length) throw new Error("duplicate csr/v2 registration");
    return Object.freeze(value);
}

export function canonicalCsrEnrollmentRegistrations(registrations: readonly CsrEnrollmentRegistration[]): string {
    return JSON.stringify(canonicalizeCsrEnrollmentRegistrations(registrations));
}

export function csrEnrollmentRegistrationsToDnsSans(registrations: readonly CsrEnrollmentRegistration[]): readonly string[] {
    return canonicalizeCsrEnrollmentRegistrations(registrations).flatMap(registration => [registration.peerId, ...registration.routedDomains]);
}

export interface CsrEnrollmentV2Request {
    version: typeof CSR_ENROLLMENT_V2_PROTOCOL_VERSION;
    requestId: string;
    principal: CsrEnrollmentPrincipal;
    csrPem: string;
    registrations: readonly CsrEnrollmentRegistration[];
    createdAt: string;
    expiresAt: string;
    /** Required for managed STH issuance; omitted only by legacy-compatible SI callers. */
    claim?: CsrEnrollmentClaim;
}

/** The public authorization record kept by the offline issuer. */
export interface CsrEnrollmentIssuedRecord extends CsrEnrollmentIssuedCertificate {
    caFingerprint256: string;
    certificateFingerprint256: string;
    certificateSerialNumber: string;
    san: readonly string[];
    revokedAt?: string;
    claim?: CsrEnrollmentClaim;
    claimDigest?: string;
    lineageId?: string;
    supersedes?: string;
}
export type CsrEnrollmentV2IssuedRecord = CsrEnrollmentIssuedRecord;

export interface CsrEnrollmentIssuedCertificate {
    version: typeof CSR_ENROLLMENT_V2_PROTOCOL_VERSION;
    certificatePem: string;
    serialNumber: string;
    fingerprint256: string;
    principal: CsrEnrollmentPrincipal;
    registrations: readonly CsrEnrollmentRegistration[];
    issuedAt: string;
    expiresAt: string;
    active: boolean;
}

export type CsrEnrollmentErrorCode = "disabled" | "invalid-request" | "invalid-csr" | "invalid-san" | "invalid-grant" | "grant-expired" | "grant-consumed" | "unauthorized";

export interface CsrEnrollmentError {
    version: typeof CSR_ENROLLMENT_PROTOCOL_VERSION;
    code: CsrEnrollmentErrorCode;
    message: string;
}

export interface CsrEnrollmentRequest {
    version: typeof CSR_ENROLLMENT_PROTOCOL_VERSION;
    hubId: string;
    csrPem: string;
    sans: readonly string[];
    nonce: string;
}

export interface CsrEnrollmentApproval {
    version: typeof CSR_ENROLLMENT_PROTOCOL_VERSION;
    grant: string;
    expiresAt: string;
    hubId: string;
    sans: readonly string[];
}

export interface CsrEnrollmentRedemptionRequest {
    version: typeof CSR_ENROLLMENT_PROTOCOL_VERSION;
    hubId: string;
    csrPem: string;
    sans: readonly string[];
    nonce: string;
}

export interface CsrEnrollmentCertificateResponse {
    version: typeof CSR_ENROLLMENT_PROTOCOL_VERSION;
    hubId: string;
    certificatePem: string;
    caFingerprint256: string;
    clientAuth: true;
    expiresAt: string;
}
