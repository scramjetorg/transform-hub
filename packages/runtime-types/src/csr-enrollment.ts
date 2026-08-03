/** Runtime-neutral CSR enrollment protocol. Secret material is never part of these contracts. */
export const CSR_ENROLLMENT_PROTOCOL_VERSION = "csr-enrollment/v1" as const;

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
