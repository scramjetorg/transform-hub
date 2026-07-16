import test from "ava";
import { execFileSync, spawnSync } from "child_process";
import { createHash, X509Certificate } from "crypto";
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { createServer } from "https";
import { tmpdir } from "os";
import { join } from "path";
import { runCsrEnrollmentCli } from "../src/lib/csr-enrollment-cli";

function captureOutput(): { output: string[]; restore: () => void } {
    const output: string[] = [];
    const original = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => { output.push(chunk.toString()); return true; }) as typeof process.stdout.write;
    return { output, restore: () => { process.stdout.write = original; } };
}

function fixture() {
    const dir = mkdtempSync(join(tmpdir(), "sth-csr-cli-test-"));
    const caKey = join(dir, "ca.key.pem");
    const caCert = join(dir, "ca.cert.pem");
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=homelab-manager-ca", "-days", "2", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign", "-keyout", caKey, "-out", caCert], { stdio: "ignore" });
    chmodSync(caKey, 0o600);
    return { dir, caKey, caCert };
}

async function run(args: string[]): Promise<string[]> {
    const capture = captureOutput();
    try { await runCsrEnrollmentCli(args); return capture.output; }
    finally { capture.restore(); }
}

test.serial("CSR CLI generates a request and rejects Manager-owned approval", async t => {
    const value = fixture();
    const requestFile = join(value.dir, "request.json");
    const generated = await run(["generate", "--identity-dir", join(value.dir, "hub"), "--hub-id", "hub-test", "--output", requestFile]);
    t.is(generated.join(""), `${requestFile}\n`);
    t.false(readFileSync(requestFile, "utf8").includes("PRIVATE KEY"));
    await t.throwsAsync(() => run(["approve", "--request", requestFile]), { message: /Unknown subcommand|Unknown option/ });
    t.regex((await run([])).join(""), /^Usage: sth-csr-enrollment /);
    await t.throwsAsync(() => run(["generate"]), { message: /Missing required option/ });
});

test.serial("CSR CLI redeems over HTTPS with a pinned CA and installs the certificate", async t => {
    const value = fixture();
    const identity = join(value.dir, "hub");
    const requestFile = join(value.dir, "request.json");
    const grantFile = join(value.dir, "grant.json");
    await run(["generate", "--identity-dir", identity, "--hub-id", "hub-test", "--output", requestFile]);
    writeFileSync(grantFile, JSON.stringify({ grant: "test-bearer" }), { mode: 0o600 });

    const serverKey = join(value.dir, "server.key.pem");
    const serverCsr = join(value.dir, "server.csr.pem");
    const serverCert = join(value.dir, "server.cert.pem");
    const ext = join(value.dir, "server.ext");
    const leafExt = join(value.dir, "leaf.ext");
    const leafCert = join(value.dir, "leaf.cert.pem");
    writeFileSync(ext, "basicConstraints=critical,CA:FALSE\nsubjectAltName=IP:127.0.0.1\n");
    execFileSync("openssl", ["req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=127.0.0.1", "-keyout", serverKey, "-out", serverCsr], { stdio: "ignore" });
    execFileSync("openssl", ["x509", "-req", "-in", serverCsr, "-CA", value.caCert, "-CAkey", value.caKey, "-CAcreateserial", "-days", "1", "-extfile", ext, "-out", serverCert], { stdio: "ignore" });
    writeFileSync(leafExt, "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=clientAuth\nsubjectAltName=DNS:hub-test\n");
    execFileSync("openssl", ["x509", "-req", "-in", join(identity, "client.csr.pem"), "-CA", value.caCert, "-CAkey", value.caKey, "-CAcreateserial", "-days", "1", "-extfile", leafExt, "-out", leafCert], { stdio: "ignore" });
    const leaf = new X509Certificate(readFileSync(leafCert, "utf8"));
    const server = createServer({ key: readFileSync(serverKey), cert: readFileSync(serverCert) }, (req, res) => {
        const body: Buffer[] = [];
        req.on("data", chunk => body.push(Buffer.from(chunk)));
        req.on("end", () => {
            t.is(req.headers.authorization, "Bearer test-bearer");
            t.false(Buffer.concat(body).toString("utf8").includes("grant"));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ version: "csr-enrollment/v1", hubId: "hub-test", certificatePem: readFileSync(leafCert, "utf8"), caFingerprint256: new X509Certificate(readFileSync(value.caCert, "utf8")).fingerprint256, clientAuth: true, expiresAt: leaf.validTo }));
        });
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
        const port = (server.address() as { port: number }).port;
        const caFingerprint = new X509Certificate(readFileSync(value.caCert, "utf8")).fingerprint256;
        const output = await run(["redeem", "--identity-dir", identity, "--request", requestFile, "--grant-file", grantFile, "--manager-url", `https://127.0.0.1:${port}`, "--ca-file", value.caCert, "--ca-fingerprint", caFingerprint]);
        t.is(output.join(""), `${identity}/client.cert.pem\n`);
        t.true(existsSync(join(identity, "client.cert.pem")));
        t.false(output.join("").includes("test-bearer"));
        t.true(createHash("sha256").update(readFileSync(value.caCert)).digest("hex").length === 64);
    } finally {
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
});

test("CSR bin renders safe usage diagnostics and generic operational failures", t => {
    const bin = join(__dirname, "../src/bin/csr-enrollment.ts");
    const env = { ...process.env, TS_NODE_TRANSPILE_ONLY: "1", SCRAMJET_AVA_FETCH: "0", NODE_OPTIONS: "--max-old-space-size=1024 --no-experimental-fetch" };
    const usage = spawnSync(process.execPath, ["-r", "ts-node/register", bin, "generate", "--unknown=SECRET"], { cwd: join(__dirname, ".."), env, encoding: "utf8", timeout: 30_000 });
    t.is(usage.status, 1);
    t.regex(usage.stderr, /Usage error: Unknown option/);
    t.false(usage.stderr.includes("SECRET"));
    const operational = spawnSync(process.execPath, ["-r", "ts-node/register", bin, "redeem", "--identity-dir", "/missing", "--request", "/missing", "--grant-file", "/missing", "--manager-url", "https://localhost", "--ca-file", "/missing", "--ca-fingerprint", "00"], { cwd: join(__dirname, ".."), env, encoding: "utf8", timeout: 30_000 });
    t.is(operational.status, 1);
    t.is(operational.stderr, "CSR enrollment command failed\n");
});
