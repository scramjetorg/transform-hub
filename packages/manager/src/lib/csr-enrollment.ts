import { createHash, createPrivateKey, createPublicKey, randomBytes, X509Certificate } from "crypto";
import { execFileSync } from "child_process";
import { chmodSync, closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "fs";
import { IncomingMessage, ServerResponse } from "http";
import { createServer, Server } from "https";
import { join } from "path";
import { CSR_ENROLLMENT_PROTOCOL_VERSION } from "@scramjet/runtime-types";
import type { CsrEnrollmentApproval, CsrEnrollmentCertificateResponse, CsrEnrollmentRedemptionRequest, CsrEnrollmentRequest } from "@scramjet/runtime-types";

const PROTOCOL_VERSION = CSR_ENROLLMENT_PROTOCOL_VERSION;

export interface CsrEnrollmentAuthorityOptions {
    enabled?: boolean;
    storageDir: string;
    caKeyFile: string;
    caCertFile: string;
    operatorApproval: string;
    leafValidityMs?: number;
    grantTtlMs?: number;
}

interface GrantRecord {
    version: typeof PROTOCOL_VERSION;
    tokenHash: string;
    csrHash: string;
    hubId: string;
    sans: readonly string[];
    nonce: string;
    expiresAt: string;
    consumed: boolean;
    issuedFingerprint256?: string;
    issuedResponse?: CsrEnrollmentCertificateResponse;
}

function hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}

function secureDirectory(dir: string): void {
    if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) throw new Error(`Enrollment directory must not be a symlink: ${dir}`);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
}

function atomicJson(file: string, value: unknown): void {
    const partial = `${file}.partial-${process.pid}`;
    try {
        writeFileSync(partial, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
        chmodSync(partial, 0o600);
        renameSync(partial, file);
    } finally {
        rmSync(partial, { force: true });
    }
}

function validateRequest(request: CsrEnrollmentRequest | CsrEnrollmentRedemptionRequest): void {
    if (request.version !== PROTOCOL_VERSION) throw new Error("Unsupported CSR enrollment protocol version");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(request.hubId)) throw new Error("Invalid Hub ID");
    if (request.sans.length !== 1 || request.sans[0] !== request.hubId) throw new Error("CSR SAN must exactly match Hub ID");
    if (!/^[a-f0-9]{32,128}$/i.test(request.nonce)) throw new Error("Invalid enrollment nonce");
    if (!request.csrPem.includes("-----BEGIN CERTIFICATE REQUEST-----")) throw new Error("Invalid CSR PEM");
}

type DerNode = { tag: number; value: Buffer; children: DerNode[] };

function readDer(buffer: Buffer, offset = 0): [DerNode, number] {
    if (offset + 2 > buffer.length) throw new Error("Truncated DER");
    const tag = buffer[offset++];
    let length = buffer[offset++];
    if (length & 0x80) {
        const count = length & 0x7f;
        if (!count || count > 4 || offset + count > buffer.length) throw new Error("Invalid DER length");
        length = 0;
        for (let i = 0; i < count; i++) length = length * 256 + buffer[offset++];
    }
    const end = offset + length;
    if (end > buffer.length) throw new Error("Truncated DER value");
    const value = buffer.subarray(offset, end);
    const children: DerNode[] = [];
    if (tag & 0x20)
        for (let childOffset = 0; childOffset < value.length; ) {
            const [child, next] = readDer(value, childOffset);
            children.push(child);
            childOffset = next;
        }
    return [{ tag, value, children }, end];
}

function derOid(node: DerNode): string {
    if (node.tag !== 0x06 || node.value.length === 0) throw new Error(`Expected DER OID (tag ${node.tag.toString(16)})`);
    const first = node.value[0];
    const parts = [Math.min(2, Math.floor(first / 40)), first >= 80 ? first - 80 : first % 40];
    let value = 0;
    for (const byte of node.value.subarray(1)) {
        value = value * 128 + (byte & 0x7f);
        if (!(byte & 0x80)) {
            parts.push(value);
            value = 0;
        }
    }
    if (value) throw new Error("Invalid DER OID");
    return parts.join(".");
}

function derText(node: DerNode): string {
    if (![0x0c, 0x13, 0x16, 0x1e].includes(node.tag)) throw new Error("Expected directory string");
    return node.tag === 0x1e ? Buffer.from(node.value).swap16().toString("utf16le") : node.value.toString("utf8");
}

function findCertificateExtension(node: DerNode, oid: string): Buffer | undefined {
    if (node.tag === 0x30 && node.children[0]?.tag === 0x06 && derOid(node.children[0]) === oid) {
        const value = node.children[node.children[1]?.tag === 0x01 ? 2 : 1];
        return value?.tag === 0x04 ? value.value : undefined;
    }
    for (const child of node.children) {
        const found = findCertificateExtension(child, oid);
        if (found) return found;
    }
    return undefined;
}

function certificateHasCaKeyUsage(certificate: X509Certificate): boolean {
    const encoded = findCertificateExtension(readDer(certificate.raw)[0], "2.5.29.15");
    if (!encoded) return false;
    const [bits] = readDer(encoded);
    return bits.tag === 0x03 && bits.value.length > 1 && (bits.value[1] & 0x04) !== 0;
}

function extensionRequest(info: DerNode): DerNode[] {
    const attrs = info.children[3];
    if (attrs?.tag !== 0xa0) throw new Error("CSR attributes are missing");
    for (const attribute of attrs.children) {
        if (attribute.children[0] && derOid(attribute.children[0]) === "1.2.840.113549.1.9.14") {
            const set = attribute.children[1];
            return set?.children[0]?.children || [];
        }
    }
    throw new Error("CSR extension request is missing");
}

function validateCsrStructure(csrPem: string, hubId: string): void {
    const der = Buffer.from(csrPem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""), "base64");
    const [request] = readDer(der);
    if (request.tag !== 0x30 || request.children.length !== 3) throw new Error("Invalid PKCS#10 structure");
    const info = request.children[0];
    if (info.tag !== 0x30 || info.children.length < 4) throw new Error("Invalid CSR information structure");
    const subject = info.children[1];
    const commonNames = subject.children.flatMap((rdn) =>
        rdn.children.filter((set) => set.children[0] && derOid(set.children[0]) === "2.5.4.3").map((set) => derText(set.children[1]))
    );
    if (commonNames.length !== 1 || commonNames[0] !== hubId) throw new Error("CSR subject CN does not match Hub ID");
    const algorithmIdentifier = info.children[2].children[0];
    const algorithmOid = derOid(algorithmIdentifier.children[0]);
    if (algorithmOid === "1.2.840.113549.1.1.1") {
        const bitString = info.children[2].children[1];
        if (!bitString || bitString.value.length < 2) throw new Error("CSR RSA key is malformed");
        const [rsaKey] = readDer(bitString.value.subarray(1));
        if (rsaKey.children[0]?.tag !== 0x02 || rsaKey.children[0].value.length < 256) throw new Error("CSR RSA key is too weak");
    } else if (algorithmOid === "1.2.840.10045.2.1") {
        const curve = algorithmIdentifier.children[1];
        if (!curve || !["1.2.840.10045.3.1.7", "1.3.132.0.34"].includes(derOid(curve))) throw new Error("CSR EC curve is not allowed");
    } else throw new Error("CSR key algorithm is not allowed");
    const extensions = extensionRequest(info);
    const dnsNames: string[] = [];
    let eku: string[] | undefined;
    const seenExtensions = new Set<string>();
    for (const extension of extensions) {
        const oid = derOid(extension.children[0]);
        if (seenExtensions.has(oid) || !["2.5.29.17", "2.5.29.37"].includes(oid)) throw new Error("CSR contains an unsupported or duplicate extension");
        seenExtensions.add(oid);
        const value = extension.children[extension.children[1]?.tag === 0x01 ? 2 : 1];
        if (!value) throw new Error("Malformed CSR extension");
        const [decoded] = readDer(value.value);
        if (oid === "2.5.29.17") for (const name of decoded.children) if (name.tag === 0x82) dnsNames.push(name.value.toString("ascii"));
        if (oid === "2.5.29.37") eku = decoded.children.map(derOid);
    }
    if (dnsNames.length !== 1 || dnsNames[0] !== hubId) throw new Error("CSR SAN does not match Hub ID");
    if (!eku || eku.length !== 1 || eku[0] !== "1.3.6.1.5.5.7.3.2") throw new Error("CSR EKU must be clientAuth only");
}

function validateCsr(csrPem: string, hubId: string): void {
    const temporary = join(require("os").tmpdir(), `scramjet-csr-${process.pid}-${randomBytes(8).toString("hex")}.pem`);
    const config = `${temporary}.cnf`;
    try {
        writeFileSync(temporary, csrPem, { mode: 0o600, flag: "wx" });
        writeFileSync(config, "", { mode: 0o600, flag: "wx" });
        if (Buffer.byteLength(csrPem, "utf8") > 256 * 1024) throw new Error("CSR is too large");
        execFileSync("openssl", ["req", "-in", temporary, "-noout", "-verify"], { stdio: "ignore" });
        validateCsrStructure(csrPem, hubId);
    } catch (error) {
        throw new Error(`CSR validation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        rmSync(temporary, { force: true });
        rmSync(config, { force: true });
    }
}

export class CsrEnrollmentAuthority {
    private readonly options: Required<Pick<CsrEnrollmentAuthorityOptions, "grantTtlMs">> & CsrEnrollmentAuthorityOptions;
    private readonly caValidToMs: number;

    constructor(options: CsrEnrollmentAuthorityOptions) {
        this.options = { grantTtlMs: 10 * 60 * 1000, ...options };
        console.warn("CSR enrollment is a controlled-deployment feature; protect the local operator approval and CA key");
        secureDirectory(options.storageDir);
        for (const file of [options.caKeyFile, options.caCertFile]) {
            if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error(`CSR enrollment CA file is missing or unsafe: ${file}`);
        }
        if ((lstatSync(options.caKeyFile).mode & 0o077) !== 0) throw new Error("CSR enrollment CA private key permissions are too broad");
        const ca = new X509Certificate(readFileSync(options.caCertFile, "utf8"));
        this.caValidToMs = Date.parse(ca.validTo);
        if (!Number.isFinite(this.caValidToMs) || this.caValidToMs <= Date.now()) throw new Error("CSR enrollment CA is expired");
        if (!ca.ca || ca.issuer !== ca.subject || !certificateHasCaKeyUsage(ca)) throw new Error("CSR enrollment CA must be a certificate-signing CA");
        const caKey = createPrivateKey(readFileSync(options.caKeyFile, "utf8"));
        const caDetails = caKey.asymmetricKeyDetails || {};
        if (caDetails.modulusLength !== undefined && caDetails.modulusLength < 2048) throw new Error("CSR enrollment CA key is too weak");
        if (caDetails.namedCurve !== undefined && caDetails.namedCurve !== "prime256v1" && caDetails.namedCurve !== "secp384r1")
            throw new Error("CSR enrollment CA EC key is too weak");
        if (
            !createPublicKey(caKey)
                .export({ type: "spki", format: "der" })
                .equals(ca.publicKey.export({ type: "spki", format: "der" }))
        )
            throw new Error("CSR enrollment CA key does not match its certificate");
    }

    approve(request: CsrEnrollmentRequest, operatorApproval: string): CsrEnrollmentApproval {
        if (this.options.enabled !== true) throw new Error("CSR enrollment is disabled");
        if (!this.options.operatorApproval || operatorApproval !== this.options.operatorApproval) throw new Error("Invalid local operator approval");
        validateRequest(request);
        validateCsr(request.csrPem, request.hubId);
        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(Date.now() + this.options.grantTtlMs).toISOString();
        const record: GrantRecord = {
            version: PROTOCOL_VERSION,
            tokenHash: hash(token),
            csrHash: hash(request.csrPem),
            hubId: request.hubId,
            sans: [...request.sans],
            nonce: request.nonce,
            expiresAt,
            consumed: false
        };
        atomicJson(join(this.options.storageDir, `${record.tokenHash}.json`), record);
        return { version: PROTOCOL_VERSION, grant: token, expiresAt, hubId: request.hubId, sans: request.sans };
    }

    redeem(request: CsrEnrollmentRedemptionRequest, grant: string): CsrEnrollmentCertificateResponse {
        if (this.options.enabled !== true) throw new Error("CSR enrollment is disabled");
        validateRequest(request);
        const file = join(this.options.storageDir, `${hash(grant)}.json`);
        if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error("Invalid or unknown enrollment grant");
        const lock = `${file}.lock`;
        let descriptor: number;
        try {
            descriptor = openSync(lock, "wx", 0o600);
        } catch {
            try {
                if (Date.now() - statSync(lock).mtimeMs > 5 * 60 * 1000) {
                    rmSync(lock, { force: true });
                    descriptor = openSync(lock, "wx", 0o600);
                } else throw new Error("Enrollment grant is busy");
            } catch (error) {
                if (error instanceof Error && error.message === "Enrollment grant is busy") throw error;
                throw new Error("Enrollment grant is busy");
            }
        }
        try {
            const record = JSON.parse(readFileSync(file, "utf8")) as GrantRecord;
            const issuedFile = join(this.options.storageDir, `issued-${record.csrHash}.json`);
            if (record.consumed && record.issuedResponse) return record.issuedResponse;
            if (record.consumed) throw new Error("Enrollment grant already consumed");
            if (Date.parse(record.expiresAt) <= Date.now()) throw new Error("Enrollment grant expired");
            if (
                record.csrHash !== hash(request.csrPem) ||
                record.hubId !== request.hubId ||
                record.nonce !== request.nonce ||
                JSON.stringify(record.sans) !== JSON.stringify(request.sans)
            )
                throw new Error("Enrollment grant binding mismatch");
            validateCsr(request.csrPem, request.hubId);
            const result = existsSync(issuedFile)
                ? (JSON.parse(readFileSync(issuedFile, "utf8")) as { response: CsrEnrollmentCertificateResponse }).response
                : this.issueCertificate(request);
            atomicJson(file, { ...record, consumed: true, issuedFingerprint256: new X509Certificate(result.certificatePem).fingerprint256, issuedResponse: result });
            return result;
        } finally {
            closeSync(descriptor);
            rmSync(lock, { force: true });
        }
    }

    private issueCertificate(request: CsrEnrollmentRedemptionRequest): CsrEnrollmentCertificateResponse {
        secureDirectory(this.options.storageDir);
        const prefix = join(this.options.storageDir, `issued-${hash(request.csrPem)}`);
        const csrFile = `${prefix}.csr.pem`;
        const certFile = `${prefix}.cert.pem`;
        const extFile = `${prefix}.ext`;
        try {
            writeFileSync(csrFile, request.csrPem, { mode: 0o600, flag: "wx" });
            writeFileSync(
                extFile,
                "basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=clientAuth\nsubjectAltName=DNS:" + request.hubId + "\n",
                { mode: 0o600, flag: "wx" }
            );
            writeFileSync(`${prefix}.srl`, randomBytes(16).toString("hex") + "\n", { mode: 0o600, flag: "wx" });
            const leafDays = Math.floor(Math.min(this.caValidToMs - Date.now(), this.options.leafValidityMs ?? 365 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
            if (leafDays < 1) throw new Error("Manager CA does not have enough validity remaining for a leaf certificate");
            execFileSync(
                "openssl",
                [
                    "x509",
                    "-req",
                    "-in",
                    csrFile,
                    "-CA",
                    this.options.caCertFile,
                    "-CAkey",
                    this.options.caKeyFile,
                    "-CAserial",
                    `${prefix}.srl`,
                    "-days",
                    String(leafDays),
                    "-sha256",
                    "-extfile",
                    extFile,
                    "-out",
                    certFile
                ],
                { stdio: "ignore" }
            );
            const certificatePem = readFileSync(certFile, "utf8");
            const certificate = new X509Certificate(certificatePem);
            const ca = new X509Certificate(readFileSync(this.options.caCertFile, "utf8"));
            if (
                certificate.ca ||
                certificate.issuer !== ca.subject ||
                !certificate.checkIssued(ca) ||
                !certificate.verify(ca.publicKey) ||
                Date.parse(certificate.validTo) > this.caValidToMs
            )
                throw new Error("Issued certificate failed CA or validity constraints");
            const result = {
                version: PROTOCOL_VERSION,
                hubId: request.hubId,
                certificatePem,
                caFingerprint256: ca.fingerprint256,
                clientAuth: true as const,
                expiresAt: new Date(certificate.validTo).toISOString()
            };
            atomicJson(`${prefix}.issued.json`, { fingerprint256: certificate.fingerprint256, hubId: request.hubId, revoked: false, response: result });
            return result;
        } finally {
            for (const file of [csrFile, certFile, extFile, `${prefix}.srl`]) rmSync(file, { force: true });
        }
    }

    isClientFingerprintAuthorized(fingerprint256: string): boolean {
        return this.isClientFingerprintAuthorizedForHub(fingerprint256);
    }

    isClientFingerprintAuthorizedForHub(fingerprint256: string, hubId?: string): boolean {
        if (this.options.enabled !== true) return false;
        for (const file of require("fs").readdirSync(this.options.storageDir) as string[]) {
            if (!file.endsWith(".issued.json")) continue;
            const record = JSON.parse(readFileSync(join(this.options.storageDir, file), "utf8")) as { fingerprint256: string; hubId: string; revoked: boolean };
            if (record.fingerprint256 === fingerprint256 && (!hubId || record.hubId === hubId) && !record.revoked) return true;
        }
        return false;
    }

    revokeClientFingerprint(fingerprint256: string): void {
        for (const file of require("fs").readdirSync(this.options.storageDir) as string[]) {
            if (!file.endsWith(".issued.json")) continue;
            const path = join(this.options.storageDir, file);
            const record = JSON.parse(readFileSync(path, "utf8"));
            if (record.fingerprint256 === fingerprint256) atomicJson(path, { ...record, revoked: true });
        }
    }
}

async function body(request: IncomingMessage): Promise<string> {
    let value = "";
    for await (const chunk of request) {
        value += chunk.toString();
        if (value.length > 1_000_000) throw new Error("Enrollment request too large");
    }
    return value;
}

export function createCsrEnrollmentHttpsServer(authority: CsrEnrollmentAuthority, tls: { key: string | Buffer; cert: string | Buffer }): Server {
    return createServer(tls, async (request: IncomingMessage, response: ServerResponse) => {
        if (request.method !== "POST" || request.url !== "/api/v2/enrollment/redeem") {
            response.writeHead(404).end();
            return;
        }
        try {
            const authorization = request.headers.authorization;
            if (!authorization || !/^Bearer [^\s]+$/.test(authorization)) throw new Error("Unauthorized");
            const payload = JSON.parse(await body(request)) as CsrEnrollmentRedemptionRequest;
            if ((payload as { grant?: unknown }).grant !== undefined) throw new Error("Invalid request");
            const result = authority.redeem(payload, authorization.slice(7));
            response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
        } catch (error) {
            response
                .writeHead(400, { "content-type": "application/json" })
                .end(JSON.stringify({ version: PROTOCOL_VERSION, code: "invalid-request", message: "CSR enrollment request rejected" }));
        }
    });
}
