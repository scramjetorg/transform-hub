import test from "ava";
import { maskConfig } from "../src/mask-config";
import { csrEnrollmentConfigSchema, csrEnrollmentOptions } from "../src/csr-enrollment-config";

test("CSR enrollment is disabled by default and masks CA key configuration", t => {
    t.false(csrEnrollmentConfigSchema.parse({}).enabled);
    const value = { csrEnrollment: { enabled: true, caKeyFile: "/private/ca.key" } };
    const masked = maskConfig(value, csrEnrollmentOptions);
    t.is((masked as any).csrEnrollment.caKeyFile, "********");
    t.is((value as any).csrEnrollment.caKeyFile, "/private/ca.key");
});

test("CSR enrollment requires complete CA configuration when enabled", t => {
    t.throws(() => csrEnrollmentConfigSchema.parse({ enabled: true }), { message: /caKeyFile|caCertFile|storageDir/ });
});
