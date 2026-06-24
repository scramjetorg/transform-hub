import { ManagerVerser2Config } from "@scramjet/api-types";
import { existsSync } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { isIP } from "net";
import { join } from "path";
import { generate } from "selfsigned";

const GENERATED_CA_CERT_FILE = "ca.pem";
const GENERATED_CA_KEY_FILE = "ca-key.pem";
const GENERATED_SERVER_CERT_FILE = "server-cert.pem";
const GENERATED_SERVER_KEY_FILE = "server-key.pem";

type GeneratedManagerVerser2HostIdentity = {
    caFile: string;
    certFile: string;
    keyFile: string;
};

function hasConfiguredHostIdentity(config: ManagerVerser2Config): boolean {
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

function existingGeneratedFiles(files: ReturnType<typeof generatedIdentityFiles>): string[] {
    return Object.values(files).filter(file => existsSync(file));
}

function getServerCommonName(config: ManagerVerser2Config, label: string): string {
    try {
        return new URL(config.host.publicUrl).hostname || label.toLowerCase();
    } catch {
        return label.toLowerCase();
    }
}

function getServerAltNames(config: ManagerVerser2Config): Array<{ type: 2; value: string } | { type: 7; ip: string }> {
    const hosts = new Set<string>();

    try {
        hosts.add(new URL(config.host.publicUrl).hostname);
    } catch {
        // Config validation handles URL shape before production use.
    }

    if (config.host.bindHost && !["0.0.0.0", "::"].includes(config.host.bindHost)) {
        hosts.add(config.host.bindHost);
    }

    return Array.from(hosts)
        .filter(Boolean)
        .map(host => isIP(host) ? { type: 7 as const, ip: host } : { type: 2 as const, value: host });
}

async function assertPrivateFileMode(file: string, label: string): Promise<void> {
    if (process.platform === "win32") {
        return;
    }

    const mode = (await stat(file)).mode & 0o777;

    if (mode !== 0o600) {
        throw new Error(`${label} verser2 private key file must use 0600 permissions: ${file}`);
    }
}

async function generateIdentityFiles(
    config: ManagerVerser2Config,
    files: ReturnType<typeof generatedIdentityFiles>,
    label: string
): Promise<void> {
    const now = new Date();
    const notAfterDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const ca = await generate([{ name: "commonName", value: `Scramjet ${label} verser2 CA` }], {
        algorithm: "sha256",
        keySize: 2048,
        notBeforeDate: now,
        notAfterDate,
        extensions: [
            { name: "basicConstraints", cA: true, pathLenConstraint: 0, critical: true },
            { name: "keyUsage", keyCertSign: true, cRLSign: true, critical: true }
        ]
    });
    const server = await generate([{ name: "commonName", value: getServerCommonName(config, label) }], {
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

async function ensureGeneratedManagerVerser2HostIdentity(
    config: ManagerVerser2Config,
    identityDir: string,
    label: string
): Promise<GeneratedManagerVerser2HostIdentity> {
    const files = generatedIdentityFiles(identityDir);

    await mkdir(identityDir, { recursive: true, mode: 0o700 });

    const existing = existingGeneratedFiles(files);

    if (existing.length && existing.length !== Object.keys(files).length) {
        throw new Error(`Incomplete ${label} verser2 Host identity in ${identityDir}`);
    }

    if (!existing.length) {
        await generateIdentityFiles(config, files, label);
    }

    await assertPrivateFileMode(files.caKeyFile, label);
    await assertPrivateFileMode(files.keyFile, label);

    return {
        caFile: files.caFile,
        certFile: files.certFile,
        keyFile: files.keyFile
    };
}

export async function resolveManagerVerser2HostConfig(
    config: ManagerVerser2Config,
    label = "Manager"
): Promise<ManagerVerser2Config> {
    if (hasConfiguredHostIdentity(config)) {
        return config;
    }

    const identityDir = config.host.identityDir;

    if (!identityDir) {
        throw new Error("verser2 Host TLS requires certFile/keyFile, pfxFile, or host.identityDir");
    }

    const identity = await ensureGeneratedManagerVerser2HostIdentity(config, identityDir, label);

    return {
        ...config,
        host: {
            ...config.host,
            tls: {
                ...config.host.tls,
                caFile: identity.caFile,
                certFile: identity.certFile,
                keyFile: identity.keyFile
            }
        }
    };
}

export async function readGeneratedManagerVerser2Ca(config: ManagerVerser2Config): Promise<string | undefined> {
    const caFile = config.host.tls.caFile;

    return caFile ? readFile(caFile, "utf8") : undefined;
}
