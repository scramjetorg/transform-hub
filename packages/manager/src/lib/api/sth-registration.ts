import { CeroError } from "@scramjet/api-server";
import { ReasonPhrases } from "http-status-codes";
import type { Manager, PrivateSthAdmission, SthRegistrationOrigin, SthRegistrationPayload } from "../manager";

/** Evidence is supplied by a trusted transport adapter, never decoded from registration JSON. */
export type SthRegistrationEvidence = {
    peerCertificateFingerprint256?: string;
    peerCertificateHubId?: string;
    authorizationContext?: {
        principal?: string;
        claim?: { realm: string; space: string; hub: string; federationHost: string; broker: string; guestRoute: string };
    };
    privateAdmission?: PrivateSthAdmission;
};

const fields = ["id", "routeDomain", "enrollmentToken", "accessKey", "description", "tags"] as const;

export function normalizeSthRegistrationPayload(value: unknown): SthRegistrationPayload {
    if (value === undefined || value === null) return {};
    if (typeof value !== "object" || Array.isArray(value)) throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");

    const input = value as Record<string, unknown>;
    // These fields represent transport identity and must never be accepted from an untrusted body.
    if ("clientCertificateFingerprint256" in input || "peerCertificateFingerprint256" in input || "peerCertificateHubId" in input || "authorizationContext" in input || "privateAdmission" in input || "federationHostId" in input)
        throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
        const fieldValue = input[field];
        if (fieldValue === undefined) continue;
        const valid = field === "tags" ? Array.isArray(fieldValue) && fieldValue.every((tag) => typeof tag === "string") : typeof fieldValue === "string";
        if (!valid) throw new CeroError("ERR_NOT_CURRENTLY_AVAILABLE");
        payload[field] = fieldValue;
    }
    return payload as SthRegistrationPayload;
}

export async function registerSth(manager: Manager, value: unknown, evidence: SthRegistrationEvidence = {}, origin: SthRegistrationOrigin = "private-v2"): Promise<{ id: string; opStatus: string }> {
    const payload = normalizeSthRegistrationPayload(value);
    const id = await manager.handleSthRegistration(
        payload,
        evidence.peerCertificateFingerprint256,
        evidence.peerCertificateHubId,
        evidence.authorizationContext,
        evidence.privateAdmission,
        origin
    );
    return { id, opStatus: ReasonPhrases.ACCEPTED };
}
