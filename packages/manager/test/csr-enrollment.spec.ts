import test from "ava";
import { execFileSync, spawnSync } from "child_process";
import { X509Certificate } from "crypto";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHubCsrEnrollmentRequest } from "../../host/src/lib/csr-enrollment";
import { CsrEnrollmentAuthority } from "../src/lib/csr-enrollment";
import { assertAuthorizedRegistrationPeer } from "../src/lib/manager";
import { runManagerCsrEnrollmentCli } from "../src/lib/csr-enrollment-cli";

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

test.serial("Manager CSR CLI approves locally with generated command validation", async t => {
    const fixture = authority();
    const request = createHubCsrEnrollmentRequest(join(fixture.dir, "hub"), "hub-test");
    const requestFile = join(fixture.dir, "request.json");
    const configFile = join(fixture.dir, "manager.json");
    const operatorFile = join(fixture.dir, "operator.secret");
    const grantFile = join(fixture.dir, "grant.json");
    writeFileSync(requestFile, JSON.stringify(request), { mode: 0o600 });
    writeFileSync(configFile, JSON.stringify({ csrEnrollment: { enabled: true, operatorApproval: "local-approval", storageDir: join(fixture.dir, "grants-cli"), caKeyFile: join(fixture.dir, "ca.key.pem"), caCertFile: join(fixture.dir, "ca.cert.pem") } }));
    writeFileSync(operatorFile, "local-approval\n", { mode: 0o600 });
    chmodSync(operatorFile, 0o600);
    const output: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => { output.push(chunk.toString()); return true; }) as typeof process.stdout.write;
    try {
        await runManagerCsrEnrollmentCli(["approve", "--manager-config", configFile, "--request", requestFile, "--operator-approval-file", operatorFile, "--grant-output", grantFile]);
    } finally { process.stdout.write = original; }
    const grant = JSON.parse(readFileSync(grantFile, "utf8"));
    t.is(output.join(""), `${grantFile}\n`);
    t.false(output.join("").includes(grant.grant));
    await t.throwsAsync(() => runManagerCsrEnrollmentCli(["approve", "--manager-config", configFile, "--request", requestFile, "--operator-approval-file", operatorFile, "--grant-output", grantFile, "--extra", "x"]), { message: /Unknown option/ });
});

test("Manager CSR bin separates safe usage errors from generic operational errors", t => {
    const bin = join(__dirname, "../src/bin/csr-enrollment.ts");
    const env = { ...process.env, TS_NODE_TRANSPILE_ONLY: "1", SCRAMJET_AVA_FETCH: "0", NODE_OPTIONS: "--max-old-space-size=1024" };
    const usage = spawnSync(process.execPath, ["-r", "ts-node/register", bin, "approve", "--unknown=SECRET"], { cwd: join(__dirname, ".."), env, encoding: "utf8", timeout: 30_000 });
    t.is(usage.status, 1);
    t.regex(usage.stderr, /Usage error: Unknown option/);
    t.false(usage.stderr.includes("SECRET"));
    const operational = spawnSync(process.execPath, ["-r", "ts-node/register", bin, "approve", "--manager-config", "/missing", "--request", "/missing", "--operator-approval-file", "/missing", "--grant-output", "/tmp/grant.json"], { cwd: join(__dirname, ".."), env, encoding: "utf8", timeout: 30_000 });
    t.is(operational.status, 1);
    t.is(operational.stderr, "Manager CSR enrollment command failed\n");
});
