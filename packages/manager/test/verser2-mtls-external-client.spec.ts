import baseTest from "ava";
const { createAvaMemoryGuard, registerAvaMemoryCleanup } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { execFileSync } from "child_process";
import { createHash, X509Certificate } from "crypto";
import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { createVerserBroker, VerserBroker } from "@signicode/verser2-guest-node";
import { createVerserHost, VerserHost } from "@signicode/verser2-host";

const http2 = require("http2") as typeof import("http2");

type ResponseBody = AsyncIterable<Buffer> & { destroy?: () => void };

const fingerprint = (certificate: string) => `sha256:${createHash("sha256").update(new X509Certificate(certificate).raw).digest("hex")}`;
const certDir = join(__dirname, "../../verser/test/cert");

async function closeTrackedSessions(sessions: Set<any>) {
    const activeSessions = [...sessions];
    const closedSessions = activeSessions.map(session => session.closed || session.destroyed
        ? Promise.resolve()
        : new Promise<void>(resolve => session.once("close", resolve)));

    for (const session of activeSessions) if (!session.closed && !session.destroyed) session.destroy();
    await Promise.all(closedSessions);
    sessions.clear();
}

async function closeTrackedTransportSockets(sockets: Set<any>, initialTlsSockets: Set<any>) {
    // Failed HTTP/2 registration destroys its session before the backing TLS
    // socket is exposed as an active handle. Wait a turn, then collect the
    // actual TLS sockets rather than the session's bound socket facade, whose
    // mutating methods intentionally throw ERR_HTTP2_NO_SOCKET_MANIPULATION.
    await new Promise<void>(resolve => setImmediate(resolve));
    const activeSockets = [...new Set([
        ...sockets,
        ...(process as any)._getActiveHandles().filter((handle: any) => handle.constructor?.name === "TLSSocket" && !initialTlsSockets.has(handle))
    ])].filter((socket: any) => socket.constructor?.name !== "bound TLSSocket");
    const closedSockets = activeSockets.map(socket => socket.destroyed
        ? Promise.resolve()
        : new Promise<void>(resolve => socket.once("close", resolve)));

    for (const socket of activeSockets) {
        socket.on("error", () => undefined);
        if (!socket.destroyed) socket.destroy();
    }
    await Promise.all(closedSockets);
    if (activeSockets.length > 0) await new Promise(resolve => setTimeout(resolve, 50));
    sockets.clear();
}

function trackTransportSocket(sockets: Set<any>, socket: any) {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.once("close", () => sockets.delete(socket));
}

function trackHostTransportSockets(host: VerserHost, sockets: Set<any>) {
    const server = (host as any).server;
    const trackSocket = (socket: any) => trackTransportSocket(sockets, socket);

    server.on("connection", trackSocket);
    server.on("secureConnection", trackSocket);
    return () => {
        server.off("connection", trackSocket);
        server.off("secureConnection", trackSocket);
    };
}

test.before(async () => {
    const clientKeyFile = join(certDir, "verser2-warmup-client.key");
    const clientCsrFile = join(certDir, "verser2-warmup-client.csr");
    const clientCertFile = join(certDir, "verser2-warmup-client.crt");
    const cleanupCredentials = () => {
        for (const file of [clientKeyFile, clientCsrFile, clientCertFile]) rmSync(file, { force: true });
        try {
            execFileSync(join(certDir, "cleanup-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
        } catch {
            // The warmup cleanup must not hide the setup failure.
        }
    };
    let host: VerserHost | undefined;
    let localGuest: Awaited<ReturnType<VerserHost["attachLocalGuest"]>> | undefined;
    const brokers: VerserBroker[] = [];
    const sessions = new Set<any>();
    const transportSockets = new Set<any>();
    const initialTlsSockets = new Set((process as any)._getActiveHandles().filter((handle: any) => handle.constructor?.name === "TLSSocket"));
    let stopTrackingHostSockets: (() => void) | undefined;
    const connect = http2.connect;
    let responseBody: ResponseBody | undefined;
    let ca: string | undefined;
    let clientCert: string | undefined;
    let clientKey: string | undefined;
    let cleanupPromise: Promise<void> | undefined;
    const cleanupResources = () => cleanupPromise ||= (async () => {
        responseBody?.destroy?.();
        responseBody = undefined;
        await Promise.all(brokers.splice(0).map(broker => broker.close("TLS baseline warmup").catch(() => undefined)));
        await localGuest?.close("TLS baseline warmup").catch(() => undefined);
        await closeTrackedSessions(sessions).catch(() => undefined);
        await closeTrackedTransportSockets(transportSockets, initialTlsSockets).catch(() => undefined);
        await host?.close("TLS baseline warmup").catch(() => undefined);
        stopTrackingHostSockets?.();
        stopTrackingHostSockets = undefined;
        (http2 as any).connect = connect;
        localGuest = undefined;
        host = undefined;
        ca = undefined;
        clientCert = undefined;
        clientKey = undefined;
    })();
    try {
        execFileSync(join(certDir, "gen-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
        execFileSync("openssl", ["genrsa", "-out", clientKeyFile, "2048"], { stdio: "ignore" });
        execFileSync("openssl", ["req", "-new", "-key", clientKeyFile, "-out", clientCsrFile, "-subj", "/CN=verser2-warmup-client"], { stdio: "ignore" });
        execFileSync("openssl", ["x509", "-req", "-in", clientCsrFile, "-CA", join(certDir, "myCA.pem"), "-CAkey", join(certDir, "myCA.key"), "-passin", "pass:test", "-CAcreateserial", "-out", clientCertFile, "-days", "1", "-sha256"], { stdio: "ignore" });
        ca = readFileSync(join(certDir, "myCA.pem"), "utf8");
        clientCert = readFileSync(clientCertFile, "utf8");
        clientKey = readFileSync(clientKeyFile, "utf8");
        host = createVerserHost({
            host: "127.0.0.1",
            port: 0,
            tls: {
                cert: readFileSync(join(certDir, "localhost.crt"), "utf8"),
                key: readFileSync(join(certDir, "localhost.key"), "utf8"),
                clientAuth: {
                    ca,
                    authorizeRegistration: context => context.metadata.local === true
                        ? { action: "allow" }
                        : context.certificate
                        ? { action: "allow" }
                        : { action: "close", reason: "client certificate required" }
                }
            }
        });
        await host.start();
        stopTrackingHostSockets = trackHostTransportSockets(host, transportSockets);
        localGuest = await host.attachLocalGuest({
            guestId: "warmup-local-guest",
            routedDomains: ["warmup.local"],
            listener: (_request, response) => response.end("warmup guest")
        });
        (http2 as any).connect = (...args: any[]) => {
            const session = (connect as any)(...args);
            sessions.add(session);
            session.on("error", () => undefined);
            session.once("close", () => sessions.delete(session));
            return session;
        };

        const broker = createVerserBroker({
            hostUrl: `https://localhost:${host.address.port}`,
            brokerId: "warmup-certificate-success",
            tls: { ca, cert: clientCert, key: clientKey }
        });
        brokers.push(broker);
        await broker.connect();
        const response = await broker.request({ targetId: "warmup-local-guest", method: "GET", path: "/" });
        responseBody = response.body;
        let body = "";
        for await (const chunk of responseBody) body += chunk.toString();
        responseBody.destroy?.();
        responseBody = undefined;
        if (response.statusCode !== 200 || body !== "warmup guest") throw new Error("TLS baseline warmup request failed");

        const missingCertificateBroker = createVerserBroker({
            hostUrl: `https://localhost:${host.address.port}`,
            brokerId: "warmup-missing-certificate",
            tls: { ca }
        });
        brokers.push(missingCertificateBroker);
        let rejected = false;
        try {
            await missingCertificateBroker.connect();
        } catch {
            rejected = true;
        }
        if (!rejected) throw new Error("TLS baseline warmup accepted a broker without a client certificate");
    } finally {
        try {
            await cleanupResources();
        } finally {
            cleanupCredentials();
        }
    }
});

test("VerserHost authenticates remote TLS brokers and enforces client fingerprint admission", async t => {
    const clientKeyFile = join(certDir, "verser2-client.key");
    const clientCsrFile = join(certDir, "verser2-client.csr");
    const clientCertFile = join(certDir, "verser2-client.crt");
    const untrustedClientKeyFile = join(certDir, "verser2-untrusted-client.key");
    const untrustedClientCertFile = join(certDir, "verser2-untrusted-client.crt");
    const cleanupCredentials = () => {
        for (const file of [clientKeyFile, clientCsrFile, clientCertFile, untrustedClientKeyFile, untrustedClientCertFile]) rmSync(file, { force: true });
        try {
            execFileSync(join(certDir, "cleanup-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
        } catch {
            // Cleanup must not prevent remaining test-owned resources from closing.
        }
    };
    t.teardown(cleanupCredentials);
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
    const sessions = new Set<any>();
    const transportSockets = new Set<any>();
    const initialTlsSockets = new Set((process as any)._getActiveHandles().filter((handle: any) => handle.constructor?.name === "TLSSocket"));
    let stopTrackingHostSockets: (() => void) | undefined;
    const connect = http2.connect;
    let responseBody: ResponseBody | undefined;
    let responseText = "";
    (http2 as any).connect = (...args: any[]) => {
        const session = (connect as any)(...args);

        sessions.add(session);
        session.on("error", () => undefined);
        session.once("close", () => sessions.delete(session));
        return session;
    };
    const closeBroker = async (broker: VerserBroker, reason: string) => {
        await broker.close(reason);

        const index = brokers.indexOf(broker);
        if (index !== -1) brokers.splice(index, 1);
    };
    let cleanupResourcesPromise: Promise<void> | undefined;
    const cleanupResources = () => cleanupResourcesPromise ||= (async () => {
        responseBody?.destroy?.();
        responseBody = undefined;
        responseText = "";
        await Promise.all([...brokers].map(broker => closeBroker(broker, "memory cleanup").catch(() => undefined)));
        await localGuest?.close("memory cleanup").catch(() => undefined);
        await closeTrackedSessions(sessions).catch(() => undefined);
        await closeTrackedTransportSockets(transportSockets, initialTlsSockets).catch(() => undefined);
        await host?.close("memory cleanup").catch(() => undefined);
        stopTrackingHostSockets?.();
        stopTrackingHostSockets = undefined;
        (http2 as any).connect = connect;
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
    })();
    registerAvaMemoryCleanup(t, cleanupResources);
    t.teardown(cleanupResources);

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
    const expectBrokerRejection = async (id: string, tls: Record<string, string> = {}) => {
        const broker = createVerserBroker({ hostUrl: `https://localhost:${host!.address.port}`, brokerId: id, tls: { ca: ca!, ...tls } });
        brokers.push(broker);
        let rejected = false;
        try {
            await broker.connect();
        } catch {
            rejected = true;
        } finally {
            await closeBroker(broker, "test complete");
        }
        t.true(rejected);
    };

    try {
        await host.start();
        stopTrackingHostSockets = trackHostTransportSockets(host, transportSockets);
        localGuest = await host.attachLocalGuest({
            guestId: "local-guest",
            routedDomains: ["local.test"],
            listener: (_request, response) => response.end("local guest")
        });

        const certificateBroker = await connectBroker("certificate-and-fingerprint-success", { cert: clientCert!, key: clientKey! });
        const response = await certificateBroker.request({ targetId: "local-guest", method: "GET", path: "/" });
        responseBody = response.body;
        for await (const chunk of responseBody) responseText += chunk.toString();
        responseBody.destroy?.();
        responseBody = undefined;
        t.is(response.statusCode, 200);
        t.is(responseText, "local guest");
        await closeBroker(certificateBroker, "test complete");
        responseText = "";

        await expectBrokerRejection("missing-certificate");
        await expectBrokerRejection("untrusted-certificate", { cert: untrustedClientCert!, key: untrustedClientKey! });

        allowedFingerprints = [fingerprint(untrustedClientCert!)];
        await expectBrokerRejection("fingerprint-denied", { cert: clientCert!, key: clientKey! });
    } finally {
        await cleanupResources();
        cleanupCredentials();
    }
});
