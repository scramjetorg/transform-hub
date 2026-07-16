import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, X509Certificate } from "crypto";
import { execFileSync } from "child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import type { CsrEnrollmentRequest } from "@scramjet/runtime-types";

const CLIENT_AUTH_OID = "1.3.6.1.5.5.7.3.2";

function secureDirectory(dir: string): void {
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) throw new Error(`CSR identity directory must not be a symlink: ${dir}`);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
}

function atomicPrivateWrite(file: string, contents: string): void {
    const temporary = `${file}.partial-${process.pid}`;
    try {
        writeFileSync(temporary, contents, { mode: 0o600, flag: "wx" });
        chmodSync(temporary, 0o600);
        renameSync(temporary, file);
    } finally {
        require("fs").rmSync(temporary, { force: true });
    }
}

function assertSafeHubId(hubId: string): void {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(hubId)) throw new Error("Invalid Hub ID for CSR enrollment");
}

export interface HubCsrIdentityPaths {
    keyFile: string;
    csrFile: string;
    certificateFile: string;
}

export interface HubEnrollmentTrust {
    managerCaPem: string;
    managerCaFingerprint256: string;
    maxLeafValidityMs?: number;
}

export function createHubCsrEnrollmentRequest(identityDir: string, hubId: string, sans: readonly string[] = [hubId]): CsrEnrollmentRequest {
    assertSafeHubId(hubId);
    if (sans.length === 0 || sans.some((san) => san !== hubId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(san))) throw new Error("CSR SANs must contain only the Hub ID");
    secureDirectory(identityDir);
    const paths: HubCsrIdentityPaths = {
        keyFile: join(identityDir, "client.key.pem"),
        csrFile: join(identityDir, "client.csr.pem"),
        certificateFile: join(identityDir, "client.cert.pem")
    };
    if (existsSync(paths.keyFile) || existsSync(paths.csrFile)) throw new Error("Refusing to overwrite existing CSR identity state");

    const pair = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "pem" }
    });
    atomicPrivateWrite(paths.keyFile, pair.privateKey);
    try {
        execFileSync(
            "openssl",
            [
                "req",
                "-new",
                "-sha256",
                "-key",
                paths.keyFile,
                "-subj",
                `/CN=${hubId}`,
                "-addext",
                `subjectAltName=DNS:${hubId}`,
                "-addext",
                `extendedKeyUsage=clientAuth`,
                "-out",
                paths.csrFile
            ],
            { stdio: "ignore" }
        );
        chmodSync(paths.csrFile, 0o600);
    } catch (error) {
        try {
            require("fs").rmSync(paths.keyFile, { force: true });
        } catch {
            /* best effort cleanup */
        }
        throw new Error(`Unable to generate Hub CSR: ${error instanceof Error ? error.message : String(error)}`);
    }
    return { version: "csr-enrollment/v1", hubId, csrPem: readFileSync(paths.csrFile, "utf8"), sans, nonce: randomBytes(32).toString("hex") };
}

export function installHubEnrollmentCertificate(identityDir: string, certificatePem: string, hubId: string, trust?: HubEnrollmentTrust): void {
    assertSafeHubId(hubId);
    secureDirectory(identityDir);
    const keyFile = join(identityDir, "client.key.pem");
    if (!existsSync(keyFile) || lstatSync(keyFile).isSymbolicLink()) throw new Error("Private key is missing or unsafe");
    const certificate = new X509Certificate(certificatePem);
    if (!trust) throw new Error("Pinned Manager CA trust is required");
    const ca = new X509Certificate(trust.managerCaPem);
    const expectedFingerprint = trust.managerCaFingerprint256.replace(/:/g, "").toLowerCase();
    const actualFingerprint = createHash("sha256").update(ca.raw).digest("hex");
    if (actualFingerprint !== expectedFingerprint) throw new Error("Manager CA fingerprint mismatch");
    if (!ca.ca || ca.issuer !== ca.subject) throw new Error("Pinned Manager certificate is not a CA");
    if (Date.parse(ca.validFrom) > Date.now() || Date.parse(ca.validTo) <= Date.now()) throw new Error("Manager CA is not currently valid");
    if (certificate.issuer !== ca.subject || !certificate.checkIssued(ca) || !certificate.verify(ca.publicKey))
        throw new Error("Enrollment certificate is not issued by the pinned Manager CA");
    if (certificate.ca) throw new Error("Enrollment certificate must not be a CA");
    if (Date.parse(certificate.validFrom) > Date.now() || Date.parse(certificate.validTo) <= Date.now()) throw new Error("Enrollment certificate is not currently valid");
    if (trust.maxLeafValidityMs && Date.parse(certificate.validTo) - Date.parse(certificate.validFrom) > trust.maxLeafValidityMs)
        throw new Error("Enrollment certificate validity is too long");
    const privatePublic = createPublicKey(createPrivateKey(readFileSync(keyFile, "utf8"))).export({ type: "spki", format: "der" });
    const certificatePublic = certificate.publicKey.export({ type: "spki", format: "der" });
    if (!privatePublic.equals(certificatePublic)) throw new Error("Enrollment certificate does not match the local private key");
    if (certificate.subjectAltName?.split(", ").filter((value) => value.startsWith("DNS:")).length !== 1 || !certificate.subjectAltName.split(", ").includes(`DNS:${hubId}`))
        throw new Error("Enrollment certificate SAN does not match the Hub ID");
    const usages = certificate.keyUsage ?? [];
    if (
        !usages.some((usage) => usage.includes("clientAuth") || usage.includes("Client Authentication") || usage === CLIENT_AUTH_OID) ||
        usages.some((usage) => usage.includes("serverAuth") || usage.includes("Server Authentication"))
    )
        throw new Error("Enrollment certificate is not clientAuth-only");
    atomicPrivateWrite(join(identityDir, "client.cert.pem"), certificatePem);
}
