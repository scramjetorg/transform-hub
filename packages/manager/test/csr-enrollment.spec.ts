import test from "ava";
import { execFileSync } from "child_process";
import { X509Certificate } from "crypto";
import { mkdtempSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHubCsrEnrollmentRequest } from "../../host/src/lib/csr-enrollment";
import { CsrEnrollmentAuthority } from "../src/lib/csr-enrollment";
import { assertAuthorizedRegistrationPeer } from "../src/lib/manager";

function authority() {
    const dir = mkdtempSync(join(tmpdir(), "manager-csr-test-"));
    const caKeyFile = join(dir, "ca.key.pem");
    const caCertFile = join(dir, "ca.cert.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=test-ca", "-days", "2", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign", "-keyout", caKeyFile, "-out", caCertFile], { stdio: "ignore" });
    return { dir, authority: new CsrEnrollmentAuthority({ enabled: true, operatorApproval: "local-approval", storageDir: join(dir, "grants"), caKeyFile, caCertFile }) };
}

test("CSR approval binds Hub, SAN, nonce, and CSR and redemption is one-time", t => {
    const fixture = authority();
    const request = createHubCsrEnrollmentRequest(join(fixture.dir, "hub"), "hub-test");
    const approval = fixture.authority.approve(request, "local-approval");
    t.is(approval.hubId, "hub-test");
    const certificate = fixture.authority.redeem(request, approval.grant);
    t.true(certificate.clientAuth);
    t.regex(certificate.certificatePem, /BEGIN CERTIFICATE/);
    const fingerprint = new X509Certificate(certificate.certificatePem).fingerprint256;
    t.true(fixture.authority.isClientFingerprintAuthorized(fingerprint));
    t.notThrows(() => assertAuthorizedRegistrationPeer(fixture.authority, "hub-test", fingerprint, "hub-test"));
    t.throws(() => assertAuthorizedRegistrationPeer(fixture.authority, "hub-b", fingerprint, "hub-a"));
    fixture.authority.revokeClientFingerprint(fingerprint);
    t.false(fixture.authority.isClientFingerprintAuthorized(fingerprint));
    t.throws(() => assertAuthorizedRegistrationPeer(fixture.authority, "hub-test", fingerprint, "hub-test", fingerprint));
    t.throws(() => assertAuthorizedRegistrationPeer(fixture.authority, "hub-test", fingerprint, "hub-test"));
    t.throws(() => assertAuthorizedRegistrationPeer(fixture.authority, "hub-test", "00:00", "hub-test"));
    t.deepEqual(fixture.authority.redeem(request, approval.grant), certificate);
});

test("CSR approval requires the configured local operator approval", t => {
    const fixture = authority();
    const request = createHubCsrEnrollmentRequest(join(fixture.dir, "hub"), "hub-test");
    t.throws(() => fixture.authority.approve(request, "wrong-approval"), { message: /operator approval/ });
});

test("CSR redemption rejects altered SAN or CSR binding", t => {
    const fixture = authority();
    const request = createHubCsrEnrollmentRequest(join(fixture.dir, "hub"), "hub-test");
    const approval = fixture.authority.approve(request, "local-approval");
    t.throws(() => fixture.authority.redeem({ ...request, sans: ["other-hub"] }, approval.grant), { message: /binding|SAN/ });
    t.throws(() => fixture.authority.redeem({ ...request, csrPem: readFileSync(join(fixture.dir, "hub", "client.key.pem"), "utf8") }, approval.grant), { message: /binding|CSR/ });
});
