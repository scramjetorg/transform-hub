import { STHRunnerVerser2HostConfig } from "@scramjet/types";
import { VerserHostOptions, VerserHostTlsOptions } from "@signicode/verser2-host";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { isIP } from "net";
import { join } from "path";
import { generate } from "selfsigned";

const GENERATED_CA_CERT_FILE = "ca.pem";
const GENERATED_CA_KEY_FILE = "ca-key.pem";
const GENERATED_SERVER_CERT_FILE = "server.pem";
const GENERATED_SERVER_KEY_FILE = "server-key.pem";

export function createSthRunnerVerser2HostOptions(config: STHRunnerVerser2HostConfig): VerserHostOptions {
    return {
        host: config.host.bindHost,
        port: config.host.bindPort,
        tls: createSthRunnerVerser2HostTlsOptions(config)
    };
}

export async function resolveSthRunnerVerser2HostConfig(config: STHRunnerVerser2HostConfig): Promise<STHRunnerVerser2HostConfig> {
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

async function loadConfiguredRunnerHostCa(config: STHRunnerVerser2HostConfig): Promise<STHRunnerVerser2HostConfig> {
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

    if (!existing.length) {
        await generateIdentityFiles(config, files);
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

function hasConfiguredHostIdentity(config: STHRunnerVerser2HostConfig): boolean {
    const tls = config.host.tls;

    return !!((tls.certFile && tls.keyFile) || tls.pfxFile);
}

function generatedIdentityFiles(identityDir: string) {
    return {
        caFile: join(identityDir, GENERATED_CA_CERT_FILE),
        caKeyFile: join(identityDir, GENERATED_CA_KEY_FILE),
        certFile: join(identityDir, GENERATED_SERVER_CERT_FILE),
        keyFile: join(identityDir, GENERATED_SERVER_KEY_FILE)
    };
}

async function existingGeneratedFiles(files: ReturnType<typeof generatedIdentityFiles>): Promise<string[]> {
    return Object.values(files).filter(file => existsSync(file));
}

async function generateIdentityFiles(config: STHRunnerVerser2HostConfig, files: ReturnType<typeof generatedIdentityFiles>): Promise<void> {
    const now = new Date();
    const notAfterDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const ca = await generate([{ name: "commonName", value: "Scramjet STH Local Runner CA" }], {
        algorithm: "sha256",
        keySize: 2048,
        notBeforeDate: now,
        notAfterDate,
        extensions: [
            { name: "basicConstraints", cA: true, pathLenConstraint: 0, critical: true },
            { name: "keyUsage", keyCertSign: true, cRLSign: true, critical: true }
        ]
    });
    const server = await generate([{ name: "commonName", value: getServerCommonName(config) }], {
        algorithm: "sha256",
        keySize: 2048,
        notBeforeDate: now,
        notAfterDate,
        ca: { key: ca.private, cert: ca.cert },
        extensions: [
            { name: "basicConstraints", cA: false, critical: true },
            { name: "keyUsage", digitalSignature: true, keyEncipherment: true, critical: true },
            { name: "extKeyUsage", serverAuth: true },
            { name: "subjectAltName", altNames: getServerAltNames(config) }
        ]
    });

    await writeFile(files.caFile, ca.cert, { mode: 0o644 });
    await writeFile(files.caKeyFile, ca.private, { mode: 0o600 });
    await writeFile(files.certFile, server.cert, { mode: 0o644 });
    await writeFile(files.keyFile, server.private, { mode: 0o600 });
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

async function assertPrivateFileMode(file: string): Promise<void> {
    if (process.platform === "win32") {
        return;
    }

    const mode = (await stat(file)).mode & 0o777;

    if (mode !== 0o600) {
        throw new Error(`STH-local runner verser2 private key file must use 0600 permissions: ${file}`);
    }
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
                    return config.registration.allowLocalPeers ? { action: "allow" } : { action: "close", reason: "local peers disabled" };
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
