import test from "ava";
import { execFileSync } from "child_process";
import { X509Certificate } from "crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createCsrV2Request } from "../../../host/src/lib/csr-enrollment";
import { CsrEnrollmentV2Issuer } from "@scramjet/manager";
import { csrEnrollmentClaimDigest, csrEnrollmentClaimUriSan } from "@scramjet/runtime-types";
import { authorizeCsrEnrollment, csrEnrollmentRecordFilename, CsrEnrollmentStore } from "../../src/lib/csr-enrollment-v2";

const registrations = [
    { principal: "sth" as const, role: "broker" as const, peerId: "sth-1", routedDomains: ["space.example"] },
    { principal: "sth" as const, role: "guest" as const, peerId: "sth-guest", routedDomains: ["guest.example"] }
];

test("v2 authorizer requires a Manager-issued fingerprint and exact registration set", t => {
    const dir = `/tmp/scramjet-csr-v2-${Date.now()}`;
    mkdirSync(dir, { recursive: true });
    t.teardown(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, "abc-01.json"), JSON.stringify({ version: "csr/v2", principal: "sth", registrations, certificateFingerprint256: "abc", certificateSerialNumber: "01", san: ["sth-1", "space.example", "sth-guest", "guest.example"], issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z", active: true }));
    const store = new CsrEnrollmentStore(dir);
    const certificate = { fingerprint256: "abc", serialNumber: "01", san: ["sth-1", "space.example", "sth-guest", "guest.example"], registrations };
    t.deepEqual(authorizeCsrEnrollment(certificate, { allowed: registrations }, store, new Date("2026-02-01T00:00:00.000Z")), { allowed: true, reason: "issued" });
    t.deepEqual(authorizeCsrEnrollment({ ...certificate, fingerprint256: "unknown" }, { allowed: registrations }, store), { allowed: false, reason: "v2 certificate was not issued (fingerprint=unknown, serial=01, record=absent)" });
    t.deepEqual(authorizeCsrEnrollment({ ...certificate, san: ["sth-1"] }, { allowed: registrations }, store), { allowed: false, reason: "certificate SAN mismatch" });
});

test("v2 authorizer retains the issued federation claim URI-SAN", t => {
    const dir = `/tmp/scramjet-csr-v2-claim-${Date.now()}`;
    const claim = { realm: "realm", space: "space", hub: "hub", federationHost: "sth.hub.runner.broker.host", broker: "hub.broker", guestRoute: "hub.example" };
    const claimUri = csrEnrollmentClaimUriSan(claim, csrEnrollmentClaimDigest(claim));
    const san = ["sth-1", "space.example", "sth-guest", "guest.example", claimUri];
    mkdirSync(dir, { recursive: true });
    t.teardown(() => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, "abc-01.json"), JSON.stringify({ version: "csr/v2", principal: "sth", registrations, certificateFingerprint256: "abc", certificateSerialNumber: "01", san, issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z", active: true, claim, claimDigest: csrEnrollmentClaimDigest(claim) }));

    t.deepEqual(authorizeCsrEnrollment({ fingerprint256: "abc", serialNumber: "01", san, registrations, claim }, { allowed: registrations }, new CsrEnrollmentStore(dir), new Date("2026-02-01T00:00:00.000Z")), {
        allowed: true,
        reason: "issued",
        authorizationContext: { principal: "sth:realm:space:hub", claim, certificateFingerprint256: "abc" }
    });
});

test("legacy compatibility is explicit and does not admit unissued v2 certificates", t => {
    const store = new CsrEnrollmentStore(`/tmp/missing-csr-v2-${Date.now()}`);
    const legacy = { fingerprint256: "legacy", serialNumber: "01", san: ["legacy"], registrations: [] };
    t.deepEqual(authorizeCsrEnrollment(legacy, { allowed: [], legacy: () => true }, store), { allowed: true, reason: "legacy" });
    t.deepEqual(authorizeCsrEnrollment({ ...legacy, registrations: [registrations[0]] }, { allowed: [] }, store), { allowed: false, reason: "v2 certificate was not issued (fingerprint=legacy, serial=01, record=absent)" });
});

test("issued store reads raw colon-delimited legacy filenames", t => {
    const dir = `/tmp/scramjet-csr-v2-legacy-${Date.now()}`;
    mkdirSync(dir, { recursive: true });
    t.teardown(() => rmSync(dir, { recursive: true, force: true }));
    const record = { version: "csr/v2", principal: "si", registrations: [], certificateFingerprint256: "AA:BB", certificateSerialNumber: "01", san: [], issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z", active: true };
    writeFileSync(join(dir, "AA:BB-01.json"), JSON.stringify(record));
    t.deepEqual(new CsrEnrollmentStore(dir).getIssued("AA:BB", "01"), record);
});

test("Manager-issued colon-delimited fingerprint is found by the MultiManager authorizer", t => {
    const dir = mkdtempSync(join(tmpdir(), "scramjet-csr-v2-regression-"));
    const issuerDir = join(dir, "issuer");
    const identityDir = join(dir, "identity");
    const issuedDir = join(dir, "issued");
    mkdirSync(issuerDir, { recursive: true });
    mkdirSync(issuedDir, { recursive: true });
    t.teardown(() => rmSync(dir, { recursive: true, force: true }));
    const caKeyFile = join(issuerDir, "ca.key.pem");
    const caCertFile = join(issuerDir, "ca.cert.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=csr-v2-test-ca", "-days", "2", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign", "-keyout", caKeyFile, "-out", caCertFile], { stdio: "ignore" });
    const request = createCsrV2Request(identityDir, "si", [{ principal: "si", role: "broker", peerId: "si-1", routedDomains: ["space.example"] }]);
    const record = new CsrEnrollmentV2Issuer({ issuer: { caFile: caCertFile, certFile: caCertFile, keyFile: caKeyFile }, issuedStore: issuedDir }).sign(request, request.registrations);
    const certificate = new X509Certificate(record.certificatePem);
    t.regex(certificate.fingerprint256, /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
    t.true(readFileSync(join(issuedDir, csrEnrollmentRecordFilename(certificate.fingerprint256, certificate.serialNumber)), "utf8").includes('"active": true'));
    const evidence = { fingerprint256: certificate.fingerprint256, serialNumber: certificate.serialNumber, san: certificate.subjectAltName!.split(", ").filter(value => value.startsWith("DNS:")).map(value => value.slice(4)), registrations: request.registrations };
    t.deepEqual(authorizeCsrEnrollment(evidence, { allowed: request.registrations }, new CsrEnrollmentStore(issuedDir)), { allowed: true, reason: "issued" });
});
