import test from "ava";
import { execFileSync } from "child_process";
import { createHash, X509Certificate } from "crypto";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHubCsrEnrollmentRequest, installHubEnrollmentCertificate } from "../src/lib/csr-enrollment";

test("Hub CSR enrollment creates a private local key with strict permissions", t => {
    const dir = mkdtempSync(join(tmpdir(), "sth-csr-test-"));
    const identity = join(dir, "identity");
    const request = createHubCsrEnrollmentRequest(identity, "hub-test");
    t.is(request.version, "csr-enrollment/v1");
    t.regex(request.csrPem, /BEGIN CERTIFICATE REQUEST/);
    t.is(statSync(identity).mode & 0o777, 0o700);
    t.is(statSync(join(identity, "client.key.pem")).mode & 0o777, 0o600);
    t.throws(() => createHubCsrEnrollmentRequest(identity, "hub-test"), { message: /existing CSR identity/ });
});

test("Hub certificate installation refuses a certificate for another key", t => {
    const dir = mkdtempSync(join(tmpdir(), "sth-csr-mismatch-"));
    mkdirSync(join(dir, "identity"));
    const request = createHubCsrEnrollmentRequest(join(dir, "identity"), "hub-test");
    t.throws(() => installHubEnrollmentCertificate(join(dir, "identity"), request.csrPem, "hub-test"));
    t.true(readFileSync(join(dir, "identity", "client.key.pem"), "utf8").includes("PRIVATE KEY"));
});

test("Hub certificate installation accepts only a certificate from the pinned Manager CA", t => {
    const dir = mkdtempSync(join(tmpdir(), "sth-csr-chain-"));
    const identity = join(dir, "identity");
    const caKey = join(dir, "ca.key.pem");
    const caCert = join(dir, "ca.cert.pem");
    const ext = join(dir, "leaf.ext");
    const cert = join(dir, "leaf.cert.pem");
    createHubCsrEnrollmentRequest(identity, "hub-test");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=manager-ca", "-days", "2", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign", "-keyout", caKey, "-out", caCert]);
    writeFileSync(ext, "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=clientAuth\nsubjectAltName=DNS:hub-test\n");
    execFileSync("openssl", ["x509", "-req", "-in", join(identity, "client.csr.pem"), "-CA", caCert, "-CAkey", caKey, "-CAcreateserial", "-days", "1", "-extfile", ext, "-out", cert]);
    const ca = new X509Certificate(readFileSync(caCert, "utf8"));
    const trust = { managerCaPem: readFileSync(caCert, "utf8"), managerCaFingerprint256: createHash("sha256").update(ca.raw).digest("hex"), maxLeafValidityMs: 2 * 24 * 60 * 60 * 1000 };
    installHubEnrollmentCertificate(identity, readFileSync(cert, "utf8"), "hub-test", trust);
    t.true(readFileSync(join(identity, "client.cert.pem"), "utf8").includes("BEGIN CERTIFICATE"));
    t.throws(() => installHubEnrollmentCertificate(identity, readFileSync(cert, "utf8"), "hub-test", { ...trust, managerCaFingerprint256: "00".repeat(32) }), { message: /fingerprint/ });
});
