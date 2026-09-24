import { STHRunnerVerser2HostConfig } from "@scramjet/api-types";
import { VerserHostOptions, VerserHostTlsOptions } from "@signicode/verser2-host";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { createPrivateKey, createPublicKey, webcrypto } from "crypto";
import { isIP } from "net";
import { join } from "path";
import {
    AuthorityKeyIdentifierExtension,
    BasicConstraintsExtension,
    ExtendedKeyUsage,
    ExtendedKeyUsageExtension,
    GeneralName,
    KeyUsagesExtension,
    PublicKey,
    SubjectAlternativeNameExtension,
    SubjectKeyIdentifierExtension,
    X509Certificate,
    X509CertificateGenerator,
    KeyUsageFlags
} from "@peculiar/x509";

const GENERATED_CA_CERT_FILE = "ca.pem";
const GENERATED_CA_KEY_FILE = "ca-key.pem";
const GENERATED_SERVER_CERT_FILE = "server.pem";
const GENERATED_SERVER_KEY_FILE = "server-key.pem";
const AUTO_RUNNER_BROKER_PEER_ID = "auto";
const UNSAFE_DEFAULT_RUNNER_BROKER_PEER_ID = "sth.default.runner.broker";

function runnerBrokerPeerIdForHost(hostId: string): string {
    return `sth.${hostId}.runner.broker`;
}

function hasConfiguredHostIdentity(config: STHRunnerVerser2HostConfig): boolean {
    const tls = config.host.tls;

    return Boolean(tls.certFile && tls.keyFile || tls.pfxFile);
}

function assertCompleteConfiguredHostIdentity(config: STHRunnerVerser2HostConfig): void {
    const tls = config.host.tls;

    if (Boolean(tls.certFile) !== Boolean(tls.keyFile)) {
        throw new Error("STH-local runner verser2 Host TLS certFile and keyFile must be provided together");
    }
}

function generatedIdentityFiles(identityDir: string) {
    return {
        caFile: join(identityDir, GENERATED_CA_CERT_FILE),
        caKeyFile: join(identityDir, GENERATED_CA_KEY_FILE),
        certFile: join(identityDir, GENERATED_SERVER_CERT_FILE),
        keyFile: join(identityDir, GENERATED_SERVER_KEY_FILE)
    };
}

async function assertPrivateFileMode(file: string): Promise<void> {
    if (process.platform === "win32") {
        return;
    }

    const mode = (await stat(file)).mode & 0o777;

    if (mode !== 0o600) {
        throw new Error(`STH-local runner verser2 private key file must use 0600 permissions: ${file}`);
    }
}

function getServerCommonName(config: STHRunnerVerser2HostConfig): string {
    try {
        return new URL(config.host.publicUrl).hostname || "sth-local-runner";
    } catch {
        return "sth-local-runner";
    }
}

function getServerAltNames(config: STHRunnerVerser2HostConfig): Array<{ type: 2; value: string } | { type: 7; ip: string }> {
    const hosts = new Set<string>();

    try {
        hosts.add(new URL(config.host.publicUrl).hostname);
    } catch {
        // publicUrl validation is handled by config layers; omit malformed SANs here.
    }

    if (config.host.bindHost && !["0.0.0.0", "::"].includes(config.host.bindHost)) {
        hosts.add(config.host.bindHost);
    }

    return Array.from(hosts)
        .filter(Boolean)
        .map(host => isIP(host) ? { type: 7 as const, ip: host } : { type: 2 as const, value: host });
}

async function existingGeneratedFiles(files: ReturnType<typeof generatedIdentityFiles>): Promise<string[]> {
    return Object.values(files).filter(file => existsSync(file));
}

function pem(type: string, data: ArrayBuffer): string {
    const encoded = Buffer.from(data).toString("base64");
    return `-----BEGIN ${type}-----\n${encoded.match(/.{1,64}/g)!.join("\n")}\n-----END ${type}-----\n`;
}

async function generateKeyPair(): Promise<CryptoKeyPair> {
    return webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]) as Promise<CryptoKeyPair>;
}

async function generateIdentityFiles(config: STHRunnerVerser2HostConfig, files: ReturnType<typeof generatedIdentityFiles>): Promise<void> {
    const now = new Date();
    const notAfterDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const caKeys = await generateKeyPair();
    const caPublicKey = await PublicKey.create(caKeys.publicKey, webcrypto as unknown as Crypto);
    const ca = await X509CertificateGenerator.createSelfSigned({
        name: "CN=Scramjet STH Local Runner CA",
        keys: caKeys,
        notBefore: now,
        notAfter: notAfterDate,
        signingAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        extensions: [
            new BasicConstraintsExtension(true, 0, true),
            new KeyUsagesExtension(KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign, true),
            await SubjectKeyIdentifierExtension.create(caPublicKey, false, webcrypto as unknown as Crypto)
        ]
    }, webcrypto as unknown as Crypto);

    const serverKeys = await generateKeyPair();
    const serverPublicKey = await PublicKey.create(serverKeys.publicKey, webcrypto as unknown as Crypto);
    const server = await X509CertificateGenerator.create({
        issuer: ca.subject,
        subject: `CN=${getServerCommonName(config)}`,
        publicKey: serverPublicKey,
        signingKey: caKeys.privateKey,
        notBefore: now,
        notAfter: notAfterDate,
        signingAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        extensions: [
            new BasicConstraintsExtension(false, undefined, true),
            new KeyUsagesExtension(KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment, true),
            new ExtendedKeyUsageExtension([ExtendedKeyUsage.serverAuth]),
            new SubjectAlternativeNameExtension(getServerAltNames(config).map(name => name.type === 7 ? new GeneralName("ip", name.ip) : new GeneralName("dns", name.value))),
            await SubjectKeyIdentifierExtension.create(serverPublicKey, false, webcrypto as unknown as Crypto),
            await AuthorityKeyIdentifierExtension.create(ca, false, webcrypto as unknown as Crypto)
        ]
    }, webcrypto as unknown as Crypto);

    await writeFile(files.caFile, ca.toString("pem"), { mode: 0o644 });
    await writeFile(files.caKeyFile, pem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", caKeys.privateKey)), { mode: 0o600 });
    await writeFile(files.certFile, server.toString("pem"), { mode: 0o644 });
    await writeFile(files.keyFile, pem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", serverKeys.privateKey)), { mode: 0o600 });
}

function samePublicKey(cert: X509Certificate, privatePem: string): boolean {
    const privateKey = createPrivateKey(privatePem);
    const publicKey = createPublicKey(privateKey).export({ type: "spki", format: "der" });
    return Buffer.from(publicKey).equals(Buffer.from(cert.publicKey.rawData));
}

async function validGeneratedIdentity(config: STHRunnerVerser2HostConfig, files: ReturnType<typeof generatedIdentityFiles>): Promise<boolean> {
    try {
        const [caPem, caKeyPem, serverPem, serverKeyPem] = await Promise.all(Object.values(files).map(file => readFile(file, "utf8")));
        const ca = new X509Certificate(caPem);
        const server = new X509Certificate(serverPem);
        const caBasic = ca.getExtension(BasicConstraintsExtension);
        const serverBasic = server.getExtension(BasicConstraintsExtension);
        const caUsage = ca.getExtension(KeyUsagesExtension);
        const serverUsage = server.getExtension(KeyUsagesExtension);
        const serverEku = server.getExtension(ExtendedKeyUsageExtension);
        const caSki = ca.getExtension(SubjectKeyIdentifierExtension);
        const serverSki = server.getExtension(SubjectKeyIdentifierExtension);
        const serverAki = server.getExtension(AuthorityKeyIdentifierExtension);
        const san = server.getExtension(SubjectAlternativeNameExtension);
        const expectedSan = getServerAltNames(config).map(name => name.type === 7 ? { type: "ip", value: name.ip } : { type: "dns", value: name.value });
        const actualSan = san?.names.toJSON();
        return caBasic?.ca === true && caBasic.pathLength === 0 && serverBasic?.ca === false &&
            caUsage?.usages === (KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign) &&
            serverUsage?.usages === (KeyUsageFlags.digitalSignature | KeyUsageFlags.keyEncipherment) &&
            serverEku?.usages.includes(ExtendedKeyUsage.serverAuth) === true &&
            caSki !== null && serverSki !== null && serverAki?.keyId === caSki?.keyId &&
            JSON.stringify(actualSan) === JSON.stringify(expectedSan) &&
            ca.notBefore <= new Date() && ca.notAfter > new Date() && server.notBefore <= new Date() && server.notAfter > new Date() &&
            server.issuer === ca.subject && await ca.isSelfSigned(webcrypto as unknown as Crypto) && await server.verify({ publicKey: ca.publicKey }, webcrypto as unknown as Crypto) &&
            samePublicKey(ca, caKeyPem) && samePublicKey(server, serverKeyPem);
    } catch {
        return false;
    }
}

export type GeneratedSthRunnerVerser2HostIdentity = {
    ca: string;
    caFile: string;
    certFile: string;
    keyFile: string;
};

export async function ensureGeneratedSthRunnerVerser2HostIdentity(config: STHRunnerVerser2HostConfig): Promise<GeneratedSthRunnerVerser2HostIdentity> {
    const files = generatedIdentityFiles(config.identityDir);

    await mkdir(config.identityDir, { recursive: true, mode: 0o700 });

    const existing = await existingGeneratedFiles(files);

    if (existing.length && existing.length !== Object.keys(files).length) {
        throw new Error(`Incomplete STH-local runner verser2 Host identity in ${config.identityDir}`);
    }

    if (existing.length) {
        await assertPrivateFileMode(files.caKeyFile);
        await assertPrivateFileMode(files.keyFile);
    }

    if (!existing.length) {
        await generateIdentityFiles(config, files);
    } else {
        if (!(await validGeneratedIdentity(config, files))) {
            await generateIdentityFiles(config, files);
        }
    }

    await assertPrivateFileMode(files.caKeyFile);
    await assertPrivateFileMode(files.keyFile);

    return {
        ca: await readFile(files.caFile, "utf8"),
        caFile: files.caFile,
        certFile: files.certFile,
        keyFile: files.keyFile
    };
}

async function loadConfiguredRunnerHostCa(config: STHRunnerVerser2HostConfig): Promise<STHRunnerVerser2HostConfig> {
    const tls = config.host.tls;
    if (tls.keyFile) await assertPrivateFileMode(tls.keyFile);
    if (tls.pfxFile) await assertPrivateFileMode(tls.pfxFile);
    if (config.ca) {
        return config;
    }

    if (!config.caFile) {
        throw new Error("STH-local runner verser2 Host explicit TLS identity requires ca or caFile for runner trust");
    }

    return {
        ...config,
        ca: await readFile(config.caFile, "utf8")
    };
}

export function createSthRunnerVerser2HostId(config: Pick<STHRunnerVerser2HostConfig, "localBroker">): string {
    return `${config.localBroker.peerId}.host`;
}

export function deriveSthRunnerVerser2HostIdentity(config: STHRunnerVerser2HostConfig, hostId?: string): STHRunnerVerser2HostConfig {
    const peerId = config.localBroker.peerId;

    if (peerId === AUTO_RUNNER_BROKER_PEER_ID) {
        if (!hostId) {
            throw new Error(
                "STH-local runner verser2 Broker peerId is 'auto' but no host ID was provided. " +
                "Set verser2.runnerHost.localBroker.peerId to an explicit value or ensure a host ID is available."
            );
        }

        return {
            ...config,
            localBroker: {
                ...config.localBroker,
                peerId: runnerBrokerPeerIdForHost(hostId)
            }
        };
    }

    return config;
}

export function checkSthRunnerVerser2LegacyBrokerPeerId(config: STHRunnerVerser2HostConfig): string | null {
    if (config.localBroker.peerId === UNSAFE_DEFAULT_RUNNER_BROKER_PEER_ID && config.enabled) {
        return (
            `STH-local runner verser2 Broker peerId "${UNSAFE_DEFAULT_RUNNER_BROKER_PEER_ID}" is unsafe for multi-STH deployments ` +
            `because it can collide across STH instances. Set verser2.runnerHost.localBroker.peerId to 'auto' for automatic ` +
            `resolution based on host ID, or configure a unique value such as 'sth.<hostId>.runner.broker'.`
        );
    }

    return null;
}

function createSthRunnerVerser2HostTlsOptions(config: STHRunnerVerser2HostConfig): VerserHostTlsOptions {
    const tls = config.host.tls;
    let identity: VerserHostTlsOptions;

    if (tls.certFile && tls.keyFile) {
        identity = {
            certFile: tls.certFile,
            keyFile: tls.keyFile,
            passphrase: tls.passphrase
        };
    } else if (tls.pfxFile) {
        identity = {
            pfxFile: tls.pfxFile,
            passphrase: tls.passphrase
        };
    } else {
        throw new Error("STH-local runner verser2 Host TLS requires certFile/keyFile or pfxFile");
    }

    if (tls.mtlsRequired && !tls.clientAuthCaFile) {
        throw new Error("STH-local runner verser2 Host mTLS requires clientAuthCaFile");
    }

    if (!tls.clientAuthCaFile && !tls.mtlsRequired && config.registration.allowedClientFingerprints.length === 0) {
        return identity;
    }

    return {
        ...identity,
        clientAuth: {
            caFile: tls.clientAuthCaFile,
            authorizeRegistration: context => {
                if (context.metadata.local === true) {
                    return { action: "allow" };
                }

                if (tls.mtlsRequired && !context.certificate) {
                    return { action: "close", reason: "runner client certificate required" };
                }

                if (config.registration.allowedClientFingerprints.length > 0) {
                    const fingerprint = context.certificate?.fingerprint256;

                    if (!fingerprint || !config.registration.allowedClientFingerprints.includes(fingerprint)) {
                        return { action: "close", reason: "runner client fingerprint not allowed" };
                    }
                }

                return { action: "allow" };
            }
        }
    };
}

export async function resolveSthRunnerVerser2HostConfig(config: STHRunnerVerser2HostConfig): Promise<STHRunnerVerser2HostConfig> {
    assertCompleteConfiguredHostIdentity(config);

    if (hasConfiguredHostIdentity(config)) {
        return loadConfiguredRunnerHostCa(config);
    }

    const identity = await ensureGeneratedSthRunnerVerser2HostIdentity(config);

    return {
        ...config,
        ca: identity.ca,
        caFile: identity.caFile,
        host: {
            ...config.host,
            tls: {
                ...config.host.tls,
                certFile: identity.certFile,
                keyFile: identity.keyFile
            }
        }
    };
}

export function createSthRunnerVerser2HostOptions(config: STHRunnerVerser2HostConfig): VerserHostOptions {
    return {
        hostId: createSthRunnerVerser2HostId(config),
        host: config.host.bindHost,
        port: config.host.bindPort,
        tls: createSthRunnerVerser2HostTlsOptions(config)
    };
}
