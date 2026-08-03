import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { execFileSync } from "child_process";
import { createHash, X509Certificate } from "crypto";
import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { createVerserBroker, VerserBroker } from "@signicode/verser2-guest-node";
import { createVerserHost, VerserHost } from "@signicode/verser2-host";

const fingerprint = (certificate: string) => `sha256:${createHash("sha256").update(new X509Certificate(certificate).raw).digest("hex")}`;
const certDir = join(__dirname, "../../verser/test/cert");

test.before(async () => {
    execFileSync(join(certDir, "gen-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
    const host = createVerserHost({
        tls: {
            cert: readFileSync(join(certDir, "localhost.crt"), "utf8"),
            key: readFileSync(join(certDir, "localhost.key"), "utf8"),
            clientAuth: { ca: readFileSync(join(certDir, "myCA.pem"), "utf8") }
        }
    });
    await host.start();
    await host.close("TLS baseline warmup");
});

test("VerserHost authenticates remote TLS brokers and enforces client fingerprint admission", async t => {
    const clientKeyFile = join(certDir, "verser2-client.key");
    const clientCsrFile = join(certDir, "verser2-client.csr");
    const clientCertFile = join(certDir, "verser2-client.crt");
    const untrustedClientKeyFile = join(certDir, "verser2-untrusted-client.key");
    const untrustedClientCertFile = join(certDir, "verser2-untrusted-client.crt");
    execFileSync(join(certDir, "gen-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
    execFileSync("openssl", ["genrsa", "-out", clientKeyFile, "2048"], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-new", "-key", clientKeyFile, "-out", clientCsrFile, "-subj", "/CN=verser2-client"], { stdio: "ignore" });
    execFileSync("openssl", ["x509", "-req", "-in", clientCsrFile, "-CA", join(certDir, "myCA.pem"), "-CAkey", join(certDir, "myCA.key"), "-passin", "pass:test", "-CAcreateserial", "-out", clientCertFile, "-days", "1", "-sha256"], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", untrustedClientKeyFile, "-out", untrustedClientCertFile, "-days", "1", "-subj", "/CN=untrusted-client"], { stdio: "ignore" });
    let ca: string | undefined = readFileSync(join(certDir, "myCA.pem"), "utf8");
    let serverCert: string | undefined = readFileSync(join(certDir, "localhost.crt"), "utf8");
    let serverKey: string | undefined = readFileSync(join(certDir, "localhost.key"), "utf8");
    let clientCert: string | undefined = readFileSync(clientCertFile, "utf8");
    let clientKey: string | undefined = readFileSync(clientKeyFile, "utf8");
    let untrustedClientCert: string | undefined = readFileSync(untrustedClientCertFile, "utf8");
    let untrustedClientKey: string | undefined = readFileSync(untrustedClientKeyFile, "utf8");
    let allowedFingerprints: string[] = [fingerprint(clientCert)];
    let host: VerserHost | undefined = createVerserHost({
        host: "127.0.0.1",
        port: 0,
        tls: {
            cert: serverCert!,
            key: serverKey!,
            clientAuth: {
                ca: ca!,
                authorizeRegistration: context => context.metadata.local === true
                    ? { action: "allow" }
                    : !context.certificate
                    ? { action: "close", reason: "client certificate required" }
                    : allowedFingerprints.length > 0 && !allowedFingerprints.includes(context.certificate.fingerprint256)
                      ? { action: "close", reason: "client fingerprint not allowed" }
                      : { action: "allow" }
            }
        }
    });
    let localGuest: Awaited<ReturnType<VerserHost["attachLocalGuest"]>> | undefined;
    const brokers: VerserBroker[] = [];
    registerAvaMemoryCleanup(t, async () => {
        await Promise.all(brokers.splice(0).map(broker => broker.close("memory cleanup").catch(() => undefined)));
        await localGuest?.close("memory cleanup");
        await host?.close("memory cleanup");
        rmSync(clientKeyFile, { force: true });
        rmSync(clientCsrFile, { force: true });
        rmSync(clientCertFile, { force: true });
        rmSync(untrustedClientKeyFile, { force: true });
        rmSync(untrustedClientCertFile, { force: true });
        for (const file of ["localhost.crt", "localhost.csr", "localhost.ext", "localhost.key", "myCA.key", "myCA.pem", "myCA.srl"]) rmSync(join(certDir, file), { force: true });
        localGuest = undefined;
        host = undefined;
        allowedFingerprints = [];
        ca = undefined;
        serverCert = undefined;
        serverKey = undefined;
        clientCert = undefined;
        clientKey = undefined;
        untrustedClientCert = undefined;
        untrustedClientKey = undefined;
    });

    const connectBroker = async (id: string, tls: Record<string, string> = {}) => {
        const broker = createVerserBroker({
            hostUrl: `https://localhost:${host!.address.port}`,
            brokerId: id,
            tls: { ca: ca!, ...tls }
        });
        brokers.push(broker);
        await broker.connect();
        return broker;
    };
    const closeBroker = async (broker: VerserBroker) => {
        await broker.close("test complete");
        brokers.splice(brokers.indexOf(broker), 1);
    };
    const expectBrokerRejection = async (id: string, tls: Record<string, string> = {}) => {
        const broker = createVerserBroker({ hostUrl: `https://localhost:${host!.address.port}`, brokerId: id, tls: { ca: ca!, ...tls } });
        brokers.push(broker);
        let rejected = false;
        try {
            await broker.connect();
        } catch {
            rejected = true;
        } finally {
            await closeBroker(broker);
        }
        t.true(rejected);
    };

    try {
        await host.start();
        localGuest = await host.attachLocalGuest({
            guestId: "local-guest",
            routedDomains: ["local.test"],
            listener: (_request, response) => response.end("local guest")
        });

        const certificateBroker = await connectBroker("certificate-and-fingerprint-success", { cert: clientCert!, key: clientKey! });
        const response = await certificateBroker.request({ targetId: "local-guest", method: "GET", path: "/" });
        let responseBody = "";
        for await (const chunk of response.body) responseBody += chunk.toString();
        t.is(response.statusCode, 200);
        t.is(responseBody, "local guest");
        await closeBroker(certificateBroker);

        await expectBrokerRejection("missing-certificate");
        await expectBrokerRejection("untrusted-certificate", { cert: untrustedClientCert!, key: untrustedClientKey! });

        allowedFingerprints = [fingerprint(untrustedClientCert!)];
        await expectBrokerRejection("fingerprint-denied", { cert: clientCert!, key: clientKey! });
    } finally {
        await Promise.all(brokers.splice(0).map(broker => broker.close("test complete").catch(() => undefined)));
        await localGuest?.close("test complete");
        await host?.close("test complete");
        rmSync(clientKeyFile, { force: true });
        rmSync(clientCsrFile, { force: true });
        rmSync(clientCertFile, { force: true });
        rmSync(untrustedClientKeyFile, { force: true });
        rmSync(untrustedClientCertFile, { force: true });
        execFileSync(join(certDir, "cleanup-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
        localGuest = undefined;
        host = undefined;
        allowedFingerprints = [];
        ca = undefined;
        serverCert = undefined;
        serverKey = undefined;
        clientCert = undefined;
        clientKey = undefined;
        untrustedClientCert = undefined;
        untrustedClientKey = undefined;
    }
});
