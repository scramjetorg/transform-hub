import { createHash, X509Certificate } from "crypto";
import { request as httpsRequest } from "https";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { URL } from "url";
import { cmd, executeCommand, generateHelp, parseCommandContext, resolveCommandPath, type CommandDescriptor } from "@scramjet/config";
import { createHubCsrEnrollmentRequest, installHubEnrollmentCertificate } from "@scramjet/host";
import type { CsrEnrollmentCertificateResponse, CsrEnrollmentRequest } from "@scramjet/runtime-types";

function secureParent(file: string): void {
    const parent = dirname(file);
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    if (lstatSync(parent).isSymbolicLink()) throw new Error("Output directory must not be a symlink");
    chmodSync(parent, 0o700);
}

function atomicProtectedJson(file: string, value: unknown): void {
    secureParent(file);
    const partial = `${file}.partial-${process.pid}`;
    try {
        writeFileSync(partial, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
        chmodSync(partial, 0o600);
        renameSync(partial, file);
    } finally {
        rmSync(partial, { force: true });
    }
}

function readJson<T>(file: string): T {
    if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error("Input file is missing or unsafe");
    return JSON.parse(readFileSync(file, "utf8")) as T;
}

function readSecretFile(file: string): string {
    if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error("Secret file is missing or unsafe");
    return readFileSync(file, "utf8").trim();
}

function generate(options: Record<string, unknown>): void {
    const identityDir = resolve(String(options["identity-dir"]));
    const output = resolve(String(options.output));
    const request = createHubCsrEnrollmentRequest(identityDir, String(options["hub-id"]));
    atomicProtectedJson(output, request);
    process.stdout.write(`${output}\n`);
}

function redeemRequest(url: URL, caPem: string, grant: string, requestBody: string): Promise<CsrEnrollmentCertificateResponse> {
    return new Promise((resolveResponse, reject) => {
        const request = httpsRequest(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || undefined,
                path: "/api/v2/enrollment/redeem",
                method: "POST",
                ca: caPem,
                rejectUnauthorized: true,
                headers: { authorization: `Bearer ${grant}`, "content-type": "application/json", "content-length": Buffer.byteLength(requestBody) }
            },
            (response) => {
                const chunks: Buffer[] = [];
                let size = 0;
                response.on("data", (chunk) => {
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    size += buffer.length;
                    if (size > 1_000_000) request.destroy(new Error("Enrollment response too large"));
                    else chunks.push(buffer);
                });
                response.on("end", () => {
                    if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) return reject(new Error("Manager rejected CSR redemption"));
                    try {
                        resolveResponse(JSON.parse(Buffer.concat(chunks).toString("utf8")) as CsrEnrollmentCertificateResponse);
                    } catch {
                        reject(new Error("Manager returned an invalid enrollment response"));
                    }
                });
            }
        );
        request.once("error", reject);
        request.end(requestBody);
    });
}

function redeem(options: Record<string, unknown>): Promise<void> {
    const identityDir = resolve(String(options["identity-dir"]));
    const request = readJson<CsrEnrollmentRequest>(resolve(String(options.request)));
    const approval = readJson<{ grant: string }>(resolve(String(options["grant-file"])));
    const caPem = readSecretFile(resolve(String(options["ca-file"])));
    const caFingerprintOption = String(options["ca-fingerprint"]);
    const caFingerprint = caFingerprintOption.replace(/:/g, "").toLowerCase();
    const ca = new X509Certificate(caPem);
    if (createHash("sha256").update(ca.raw).digest("hex") !== caFingerprint) throw new Error("Pinned Manager CA fingerprint mismatch");
    const url = new URL(String(options["manager-url"]));
    if (url.protocol !== "https:") throw new Error("Manager URL must use HTTPS");
    return redeemRequest(url, caPem, approval.grant, JSON.stringify(request)).then((response) => {
        installHubEnrollmentCertificate(identityDir, response.certificatePem, request.hubId, { managerCaPem: caPem, managerCaFingerprint256: caFingerprintOption });
        process.stdout.write(`${identityDir}/client.cert.pem\n`);
    });
}

const stringOption = (name: string, description: string) => ({ name, flag: name, type: "string" as const, required: true, description });

export function createSthCsrEnrollmentCommand(): CommandDescriptor {
    return cmd("sth-csr-enrollment", (root) =>
        root
            .desc("Developer and homelab Hub CSR enrollment tools")
            .children(
                cmd("generate", (command) =>
                    command
                        .desc("Generate a Hub-local key and CSR request file")
                        .option(stringOption("identity-dir", "Hub-local identity directory"))
                        .option(stringOption("hub-id", "Hub identifier"))
                        .option(stringOption("output", "Protected request output file"))
                        .action((options) => generate(options))
                ),
                cmd("redeem", (command) =>
                    command
                        .desc("Redeem a protected grant over pinned HTTPS and install the certificate")
                        .option(stringOption("identity-dir", "Hub-local identity directory"))
                        .option(stringOption("request", "CSR request file"))
                        .option(stringOption("grant-file", "Protected one-time grant file"))
                        .option(stringOption("manager-url", "Manager HTTPS base URL"))
                        .option(stringOption("ca-file", "Pinned Manager CA certificate"))
                        .option(stringOption("ca-fingerprint", "Pinned Manager CA SHA-256 fingerprint"))
                        .action((options) => redeem(options))
                )
            )
            .build()
    );
}

export async function runCsrEnrollmentCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
    const root = createSthCsrEnrollmentCommand();
    const resolved = resolveCommandPath([root.name, ...argv], root);
    const commandPath = resolved.path.map((command) => command.name).join(" ");
    if (argv.includes("--help") || argv.includes("-h") || (Boolean(resolved.command.children?.length) && resolved.remainder.length === 0)) {
        process.stdout.write(`${generateHelp(resolved.command, commandPath)}\n`);
        return;
    }
    await executeCommand(parseCommandContext(resolved));
}
