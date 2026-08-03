import { z } from "zod";
import type { ConfigOptionDescriptor } from "./index";

/** CSR enrollment is intentionally opt-in; paths are never emitted as secret material. */
export const csrEnrollmentConfigSchema = z
    .object({
        enabled: z.boolean().default(false),
        operatorApproval: z.string().min(1).optional(),
        storageDir: z.string().min(1).optional(),
        caKeyFile: z.string().min(1).optional(),
        caCertFile: z.string().min(1).optional(),
        redemptionPath: z.literal("/api/v2/enrollment/redeem").default("/api/v2/enrollment/redeem")
    })
    .strict()
    .superRefine((value, ctx) => {
        if (!value.enabled) return;
        if (!value.storageDir) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["storageDir"], message: "storageDir is required when CSR enrollment is enabled" });
        if (!value.caKeyFile) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["caKeyFile"], message: "caKeyFile is required when CSR enrollment is enabled" });
        if (!value.caCertFile) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["caCertFile"], message: "caCertFile is required when CSR enrollment is enabled" });
        if (!value.operatorApproval)
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["operatorApproval"], message: "operatorApproval is required when CSR enrollment is enabled" });
    });

export const csrEnrollmentDefaultConfig = {
    enabled: false,
    redemptionPath: "/api/v2/enrollment/redeem" as const
};

export const csrEnrollmentOptions: ConfigOptionDescriptor[] = [
    {
        name: "csrEnrollmentOperatorApproval",
        flag: "csr-enrollment-operator-approval",
        path: "csrEnrollment.operatorApproval",
        env: "SCRAMJET_CSR_ENROLLMENT_OPERATOR_APPROVAL",
        type: "string",
        secret: true,
        description: "Required local operator approval for CSR issuance"
    },
    {
        name: "csrEnrollmentEnabled",
        flag: "csr-enrollment-enabled",
        path: "csrEnrollment.enabled",
        env: "SCRAMJET_CSR_ENROLLMENT_ENABLED",
        type: "boolean",
        defaultValue: false,
        description: "Enable CSR enrollment (disabled by default)"
    },
    {
        name: "csrEnrollmentStorageDir",
        flag: "csr-enrollment-storage-dir",
        path: "csrEnrollment.storageDir",
        env: "SCRAMJET_CSR_ENROLLMENT_STORAGE_DIR",
        type: "string",
        secret: true,
        description: "Private CSR enrollment grant storage directory"
    },
    {
        name: "csrEnrollmentCaKeyFile",
        flag: "csr-enrollment-ca-key-file",
        path: "csrEnrollment.caKeyFile",
        env: "SCRAMJET_CSR_ENROLLMENT_CA_KEY_FILE",
        type: "string",
        secret: true,
        description: "CSR enrollment CA private key file"
    },
    {
        name: "csrEnrollmentCaCertFile",
        flag: "csr-enrollment-ca-cert-file",
        path: "csrEnrollment.caCertFile",
        env: "SCRAMJET_CSR_ENROLLMENT_CA_CERT_FILE",
        type: "string",
        secret: true,
        description: "CSR enrollment CA certificate file"
    }
];
