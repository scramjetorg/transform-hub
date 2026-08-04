import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { execFileSync } from "child_process";
import { createHash, X509Certificate } from "crypto";
import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { createVerserBroker, VerserBroker } from "@signicode/verser2-guest-node";
import { createVerserHost, VerserHost } from "@signicode/verser2-host";

const http2 = require("http2") as typeof import("http2");
const tls = require("tls") as typeof import("tls");

type ResponseBody = AsyncIterable<Buffer> & { destroy?: () => void };

const fingerprint = (certificate: string) => `sha256:${createHash("sha256").update(new X509Certificate(certificate).raw).digest("hex")}`;
const certDir = join(__dirname, "../../verser/test/cert");

function trackClose(records: Map<any, Promise<void>>, obj: any) {
    const tracked = records.get(obj);
    if (tracked) return tracked;

    if (!obj) return Promise.resolve();

    const closed = obj?.closed || obj?.destroyed;
    const closePromise = new Promise<void>(resolve => {
        if (closed) {
            resolve();
        } else {
            obj.once("close", resolve);
        }
    });

    obj?.on("error", () => undefined);
    records.set(obj, closePromise);

    return closePromise;
}

async function closeTrackedClientSessions(sessions: Map<any, Promise<void>>) {
    const activeSessions = [...sessions].filter(([session]) => !session.closed && !session.destroyed);
    for (const [session] of activeSessions) {
        if (!session.closed && !session.destroyed) {
            session.destroy();
        }
    }

    await Promise.all(activeSessions.map(([, closePromise]) => closePromise));
}

async function closeTrackedTransportSockets(sockets: Map<any, Promise<void>>) {
    const activeSockets = [...sockets.keys()].filter(socket => !socket.destroyed);
    const closePromises = activeSockets.map(socket => socket.closed || socket.destroyed
        ? Promise.resolve()
        : trackClose(sockets, socket));

    for (const socket of activeSockets) {
        if (!socket.destroyed) {
            socket.destroy();
        }
    }

    await Promise.all(closePromises);
}

function trackHostTransportSockets(host: VerserHost, sockets: Map<any, Promise<void>>) {
    const server = (host as any).server;
    const track = (socket: any) => trackClose(sockets, socket);

    server.on("connection", track);
    server.on("secureConnection", track);
    return () => {
        server.off("connection", track);
        server.off("secureConnection", track);
    };
}

const clientKeyFile = join(certDir, "verser2-client.key");
const clientCsrFile = join(certDir, "verser2-client.csr");
const clientCertFile = join(certDir, "verser2-client.crt");
const untrustedClientKeyFile = join(certDir, "verser2-untrusted-client.key");
const untrustedClientCertFile = join(certDir, "verser2-untrusted-client.crt");
const generatedCredentials = [clientKeyFile, clientCsrFile, clientCertFile, untrustedClientKeyFile, untrustedClientCertFile];

let ca: string | undefined;
let clientCert: string | undefined;
let clientKey: string | undefined;
let untrustedClientCert: string | undefined;
let untrustedClientKey: string | undefined;
let allowedFingerprints: string[] = [];
let host: VerserHost | undefined;
let localGuest: Awaited<ReturnType<VerserHost["attachLocalGuest"]>> | undefined;
let responseBody: ResponseBody | undefined;
let stopTrackingHostSockets: (() => void) | undefined;
const brokers: VerserBroker[] = [];
const sessions = new Map<any, Promise<void>>();
const transportSockets = new Map<any, Promise<void>>();
const connect = http2.connect;
const tlsConnect = tls.connect;

function cleanupCredentials() {
    for (const file of generatedCredentials) rmSync(file, { force: true });
    try {
        execFileSync(join(certDir, "cleanup-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
    } catch {
        // Generated credentials must not hide an earlier test failure.
    }
}

async function closeBroker(broker: VerserBroker, reason: string) {
    await broker.close(reason);

    const index = brokers.indexOf(broker);
    if (index !== -1) brokers.splice(index, 1);
}

async function connectBroker(id: string, tls: Record<string, string> = {}) {
    const broker = createVerserBroker({
        hostUrl: `https://localhost:${host!.address.port}`,
        brokerId: id,
        tls: { ca: ca!, ...tls }
    });
    brokers.push(broker);
    await broker.connect();
    return broker;
}

test.before(async () => {
    execFileSync(join(certDir, "gen-localhost-cert.sh"), { cwd: certDir, stdio: "ignore" });
    execFileSync("openssl", ["genrsa", "-out", clientKeyFile, "2048"], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-new", "-key", clientKeyFile, "-out", clientCsrFile, "-subj", "/CN=verser2-client"], { stdio: "ignore" });
    execFileSync("openssl", ["x509", "-req", "-in", clientCsrFile, "-CA", join(certDir, "myCA.pem"), "-CAkey", join(certDir, "myCA.key"), "-passin", "pass:test", "-CAcreateserial", "-out", clientCertFile, "-days", "1", "-sha256"], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", untrustedClientKeyFile, "-out", untrustedClientCertFile, "-days", "1", "-subj", "/CN=untrusted-client"], { stdio: "ignore" });
    ca = readFileSync(join(certDir, "myCA.pem"), "utf8");
    clientCert = readFileSync(clientCertFile, "utf8");
    clientKey = readFileSync(clientKeyFile, "utf8");
    untrustedClientCert = readFileSync(untrustedClientCertFile, "utf8");
    untrustedClientKey = readFileSync(untrustedClientKeyFile, "utf8");
    allowedFingerprints = [fingerprint(clientCert)];
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
                    : !context.certificate
                    ? { action: "close", reason: "client certificate required" }
                    : allowedFingerprints.length > 0 && !allowedFingerprints.includes(context.certificate.fingerprint256)
                      ? { action: "close", reason: "client fingerprint not allowed" }
                      : { action: "allow" }
            }
        }
    });
    await host.start();
    stopTrackingHostSockets = trackHostTransportSockets(host, transportSockets);
    localGuest = await host.attachLocalGuest({
        guestId: "local-guest",
        routedDomains: ["local.test"],
        listener: (_request, response) => response.end("local guest")
    });
    (http2 as any).connect = (...args: any[]) => {
        const session = (connect as any)(...args);

        trackClose(sessions, session);
        return session;
    };
    (tls as any).connect = (...args: any[]) => {
        const socket = (tlsConnect as any)(...args);

        trackClose(transportSockets, socket);
        return socket;
    };
});

test.after(async () => {
    try {
        responseBody?.destroy?.();
        responseBody = undefined;
        try {
            await Promise.all(brokers.splice(0).map(broker => broker.close("test complete")));
        } finally {
            try {
                await closeTrackedClientSessions(sessions);
            } finally {
                // These are real TLS/TCP sockets captured at connection time,
                // never the immutable HTTP/2 session.socket facade. Closing
                // them before the host prevents host.close() from waiting on
                // a peer that the test still owns.
                try {
                    await closeTrackedTransportSockets(transportSockets);
                } finally {
                    try {
                        await localGuest?.close("test complete");
                    } finally {
                        await host?.close("test complete");
                    }
                }
            }
        }
    } finally {
        try {
            stopTrackingHostSockets?.();
        } finally {
            stopTrackingHostSockets = undefined;
            (http2 as any).connect = connect;
            (tls as any).connect = tlsConnect;
            localGuest = undefined;
            host = undefined;
            allowedFingerprints = [];
            ca = undefined;
            clientCert = undefined;
            clientKey = undefined;
            untrustedClientCert = undefined;
            untrustedClientKey = undefined;
            cleanupCredentials();
        }
    }
});

test("VerserHost authenticates remote TLS brokers and enforces client fingerprint admission", async t => {
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

    const certificateBroker = await connectBroker("certificate-and-fingerprint-success", { cert: clientCert!, key: clientKey! });
    const response = await certificateBroker.request({ targetId: "local-guest", method: "GET", path: "/" });
    responseBody = response.body;
    let responseText = "";
    for await (const chunk of responseBody) responseText += chunk.toString();
    responseBody.destroy?.();
    responseBody = undefined;
    t.is(response.statusCode, 200);
    t.is(responseText, "local guest");
    await closeBroker(certificateBroker, "test complete");

    await expectBrokerRejection("missing-certificate");
    await expectBrokerRejection("untrusted-certificate", { cert: untrustedClientCert!, key: untrustedClientKey! });

    allowedFingerprints = [fingerprint(untrustedClientCert!)];
    await expectBrokerRejection("fingerprint-denied", { cert: clientCert!, key: clientKey! });
});
