import { createHash, createPrivateKey, createPublicKey, X509Certificate } from "crypto";
import { execFileSync } from "child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import type { CsrEnrollmentV2IssuedRecord, CsrEnrollmentRegistration, CsrEnrollmentV2Request } from "@scramjet/runtime-types";
import {
    canonicalCsrEnrollmentRegistrations,
    canonicalizeCsrEnrollmentRegistrations,
    csrEnrollmentRegistrationsToDnsSans,
    csrEnrollmentClaimDigest,
    csrEnrollmentClaimUriSan,
    CSR_ENROLLMENT_V2_PROTOCOL_VERSION
} from "@scramjet/runtime-types";

export interface CsrEnrollmentV2IssuerOptions {
    issuer: { caFile: string; certFile: string; keyFile: string; passphrase?: string };
    issuedStore: string;
    leafValidityMs?: number;
    rotationOverlapMs?: number;
}

export function normalizeCsrEnrollmentFilenamePart(value: string): string {
    return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function csrEnrollmentRecordFilename(fingerprint256: string, serialNumber: string): string {
    return `${normalizeCsrEnrollmentFilenamePart(fingerprint256)}-${normalizeCsrEnrollmentFilenamePart(serialNumber)}.json`;
}

function atomicJson(file: string, value: unknown): void {
    const parent = join(file, "..");
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    chmodSync(parent, 0o700);
    const partial = `${file}.partial-${process.pid}`;
    try {
        writeFileSync(partial, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
        chmodSync(partial, 0o600);
        renameSync(partial, file);
    } finally {
        rmSync(partial, { force: true });
    }
}

function safeFile(file: string): void {
    if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error(`Issuer file is missing or unsafe: ${file}`);
}

function readRequestCsr(csrPem: string, expectedSans: readonly string[]): void {
    if (Buffer.byteLength(csrPem, "utf8") > 256 * 1024 || !/^-----BEGIN CERTIFICATE REQUEST-----/.test(csrPem.trim())) throw new Error("Invalid csr/v2 CSR");
    const file = join(require("os").tmpdir(), `scramjet-csr-v2-${process.pid}-${Date.now()}.pem`);
    try {
        writeFileSync(file, csrPem, { mode: 0o600, flag: "wx" });
        execFileSync("openssl", ["req", "-in", file, "-noout", "-verify"], { stdio: "ignore" });
        const text = execFileSync("openssl", ["req", "-in", file, "-noout", "-text"], { encoding: "utf8" });
        if (!/Subject:.*CN\s*=\s*[^,\n]+/.test(text) || !/X509v3 Subject Alternative Name/i.test(text) || !/X509v3 Extended Key Usage/i.test(text))
            throw new Error("CSR is missing subject, SAN, or EKU");
        const sans = [...text.matchAll(/DNS:([^,\s]+)/g)].map(value => value[1]);
        const uris = [...text.matchAll(/URI:([^,\s]+)/g)].map(value => value[1]);
        const expectedDns = expectedSans.filter(value => !value.startsWith("urn:"));
        const expectedUris = expectedSans.filter(value => value.startsWith("urn:"));
        if (JSON.stringify(sans) !== JSON.stringify(expectedDns) || JSON.stringify(uris) !== JSON.stringify(expectedUris)) throw new Error("CSR SAN does not match the exact registration set");
        const ekuLine = text.split(/\r?\n/).find(line => /Client Authentication|clientAuth/.test(line));
        if (!ekuLine || /Server Authentication|serverAuth/.test(text)) throw new Error("CSR EKU must be clientAuth only");
    } catch (error) {
        throw new Error(`CSR validation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        rmSync(file, { force: true });
    }
}

function validateRequest(request: CsrEnrollmentV2Request, expected: readonly CsrEnrollmentRegistration[]): readonly CsrEnrollmentRegistration[] {
    if (request.version !== CSR_ENROLLMENT_V2_PROTOCOL_VERSION || !request.requestId || request.principal === undefined) throw new Error("Invalid csr/v2 request");
    if (!Number.isFinite(Date.parse(request.createdAt)) || !Number.isFinite(Date.parse(request.expiresAt)) || Date.parse(request.expiresAt) <= Date.now() || Date.parse(request.createdAt) > Date.now() + 60_000) throw new Error("Invalid or expired csr/v2 request lifetime");
    const actual = canonicalizeCsrEnrollmentRegistrations(request.registrations);
    const allowed = canonicalizeCsrEnrollmentRegistrations(expected);
    if (canonicalCsrEnrollmentRegistrations(actual) !== canonicalCsrEnrollmentRegistrations(allowed)) throw new Error("Registration set does not match the Manager-side expected set");
    if (actual.some(value => value.principal !== request.principal)) throw new Error("Registration principal does not match the request principal");
    if (request.principal === "si" && (actual.length !== 1 || actual[0].role !== "broker")) throw new Error("si must authorize exactly one broker");
    if (request.principal === "sth" && !actual.some(value => value.role === "broker")) throw new Error("sth must authorize a broker");
    if (request.principal === "sth" && !request.claim) throw new Error("sth csr/v2 requests require an exact federation claim");
    const expectedSans = [...csrEnrollmentRegistrationsToDnsSans(actual)];
    if (request.claim) expectedSans.push(csrEnrollmentClaimUriSan(request.claim, csrEnrollmentClaimDigest(request.claim)));
    readRequestCsr(request.csrPem, expectedSans);
    return actual;
}

export class CsrEnrollmentV2Issuer {
    private readonly options: Required<Pick<CsrEnrollmentV2IssuerOptions, "leafValidityMs">> & CsrEnrollmentV2IssuerOptions;
    private readonly ca: X509Certificate;

    constructor(options: CsrEnrollmentV2IssuerOptions) {
        this.options = { leafValidityMs: 365 * 24 * 60 * 60 * 1000, ...options };
        for (const file of [options.issuer.caFile, options.issuer.certFile, options.issuer.keyFile]) safeFile(file);
        mkdirSync(options.issuedStore, { recursive: true, mode: 0o700 });
        chmodSync(options.issuedStore, 0o700);
        this.ca = new X509Certificate(readFileSync(options.issuer.certFile, "utf8"));
        if (!this.ca.ca || this.ca.issuer !== this.ca.subject) throw new Error("Issuer certificate is not a CA");
        if ((lstatSync(options.issuer.keyFile).mode & 0o077) !== 0) throw new Error("Issuer private key permissions are too broad");
        const key = createPrivateKey(readFileSync(options.issuer.keyFile, "utf8"));
        if (!createPublicKey(key).export({ type: "spki", format: "der" }).equals(this.ca.publicKey.export({ type: "spki", format: "der" }))) throw new Error("Issuer key does not match its certificate");
    }

    sign(request: CsrEnrollmentV2Request, expected: readonly CsrEnrollmentRegistration[]): CsrEnrollmentV2IssuedRecord {
        const registrations = validateRequest(request, expected);
        const claimDigest = request.claim ? csrEnrollmentClaimDigest(request.claim) : undefined;
        if (request.claim) {
            for (const file of require("fs").readdirSync(this.options.issuedStore) as string[]) {
                if (!file.endsWith(".json")) continue;
                try {
                    const existing = JSON.parse(readFileSync(join(this.options.issuedStore, file), "utf8")) as CsrEnrollmentV2IssuedRecord;
                    if (existing.active && existing.claimDigest === claimDigest && Date.parse(existing.expiresAt) > Date.now()) throw new Error("csr/v2 binding already has an active certificate; rotate or revoke it first");
                } catch (error) {
                    if (error instanceof Error && error.message.includes("binding already")) throw error;
                }
            }
        }
        const prefix = join(this.options.issuedStore, `v2-${createHash("sha256").update(request.requestId).digest("hex")}`);
        const csrFile = `${prefix}.csr.pem`, certFile = `${prefix}.cert.pem`, extFile = `${prefix}.ext`, serialFile = `${prefix}.srl`;
        const sans = csrEnrollmentRegistrationsToDnsSans(registrations);
        const claimUri = request.claim ? csrEnrollmentClaimUriSan(request.claim, csrEnrollmentClaimDigest(request.claim)) : undefined;
        try {
            writeFileSync(csrFile, request.csrPem, { mode: 0o600, flag: "wx" });
            writeFileSync(extFile, `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=clientAuth\nsubjectAltName=${sans.map(value => `DNS:${value}`).concat(claimUri ? [`URI:${claimUri}`] : []).join(",")}\n`, { mode: 0o600, flag: "wx" });
            writeFileSync(serialFile, `${createHash("sha256").update(request.requestId).digest("hex")}\n`, { mode: 0o600, flag: "wx" });
            const days = Math.floor(Math.min(this.options.leafValidityMs, Date.parse(this.ca.validTo) - Date.now()) / 86400000);
            if (days < 1) throw new Error("Issuer CA does not have enough validity remaining");
            execFileSync("openssl", ["x509", "-req", "-in", csrFile, "-CA", this.options.issuer.certFile, "-CAkey", this.options.issuer.keyFile, "-CAserial", serialFile, "-days", String(days), "-sha256", "-extfile", extFile, "-out", certFile], { stdio: "ignore" });
            const certificate = new X509Certificate(readFileSync(certFile, "utf8"));
            if (certificate.ca || !certificate.verify(this.ca.publicKey) || !certificate.checkIssued(this.ca)) throw new Error("Issued certificate failed CA validation");
            const record: CsrEnrollmentV2IssuedRecord = { version: CSR_ENROLLMENT_V2_PROTOCOL_VERSION, certificatePem: certificate.toString(), serialNumber: certificate.serialNumber, fingerprint256: certificate.fingerprint256, certificateFingerprint256: certificate.fingerprint256, certificateSerialNumber: certificate.serialNumber, san: sans.concat(claimUri ? [claimUri] : []), caFingerprint256: this.ca.fingerprint256, principal: request.principal, registrations, issuedAt: new Date().toISOString(), expiresAt: certificate.validTo, active: true, ...(request.claim ? { claim: request.claim, claimDigest, lineageId: claimDigest } : {}) };
            atomicJson(join(this.options.issuedStore, csrEnrollmentRecordFilename(record.certificateFingerprint256, record.certificateSerialNumber)), record);
            return record;
        } finally {
            for (const file of [csrFile, certFile, extFile, serialFile]) rmSync(file, { force: true });
        }
    }

    revoke(selector: string): void {
        for (const file of require("fs").readdirSync(this.options.issuedStore) as string[]) {
            if (!file.endsWith(".json")) continue;
            const path = join(this.options.issuedStore, file);
            const record = JSON.parse(readFileSync(path, "utf8")) as CsrEnrollmentV2IssuedRecord;
            if (record.fingerprint256 === selector || record.serialNumber === selector || file.startsWith(normalizeCsrEnrollmentFilenamePart(selector))) atomicJson(path, { ...record, active: false, revokedAt: new Date().toISOString() });
        }
    }
}
