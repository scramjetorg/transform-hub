import test from "ava";
import { registerSth, normalizeSthRegistrationPayload } from "../src/lib/api/sth-registration";

test("registration preserves legacy fields and returns the v1 response envelope", async (t) => {
    const payload = { id: "hub-a", routeDomain: "hub-a.test", enrollmentToken: "token", accessKey: "key", description: "legacy", tags: ["a"] };
    let received: unknown;
    const result = await registerSth({ handleSthRegistration: async (value: unknown) => { received = value; return "hub-a"; } } as any, payload);

    t.deepEqual(received, payload);
    t.deepEqual(result, { id: "hub-a", opStatus: "Accepted" });
});

test("registration normalizes an absent body and rejects malformed payloads", (t) => {
    t.deepEqual(normalizeSthRegistrationPayload(undefined), {});
    t.throws(() => normalizeSthRegistrationPayload({ tags: "not-an-array" }));
});

test("body-supplied certificate and federation identity evidence is rejected", (t) => {
    for (const field of ["clientCertificateFingerprint256", "peerCertificateFingerprint256", "peerCertificateHubId", "authorizationContext"]) {
        t.throws(() => normalizeSthRegistrationPayload({ id: "hub-a", [field]: "forged" }), { instanceOf: Error });
    }
});

test("trusted transport evidence is passed separately from registration JSON", async (t) => {
    const evidence = { peerCertificateFingerprint256: "fingerprint", peerCertificateHubId: "hub-a" };
    let receivedArgs: unknown[] = [];
    await registerSth({ handleSthRegistration: async (...args: unknown[]) => { receivedArgs = args; return "hub-a"; } } as any, { id: "hub-a" }, evidence);

    t.deepEqual(receivedArgs, [{ id: "hub-a" }, "fingerprint", "hub-a", undefined]);
});
