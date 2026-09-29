import { createCsrV2Request, installCsrV2Certificate } from "@scramjet/host";
import { mkdirSync, readFileSync, lstatSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import type { CsrEnrollmentV2Request } from "@scramjet/runtime-types";

function readJson<T>(file: string): T {
    if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error("Input file is missing or unsafe");
    return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function generateSiIdentity(options: Record<string, unknown>): void {
    const output = resolve(String(options.output));
    mkdirSync(dirname(output), { recursive: true, mode: 0o700 });
    const registrations = readJson<any[]>(resolve(String(options.registrations)));
    const request = createCsrV2Request(resolve(String(options["identity-dir"])), "si", registrations);
    require("fs").writeFileSync(output, `${JSON.stringify(request, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    process.stdout.write(`${output}\n`);
}

export function installSiIdentity(options: Record<string, unknown>): void {
    const request = readJson<CsrEnrollmentV2Request>(resolve(String(options.request)));
    const certificate = readFileSync(resolve(String(options.certificate)), "utf8");
    const caPem = readFileSync(resolve(String(options["ca-file"])), "utf8");
    installCsrV2Certificate(resolve(String(options["identity-dir"])), certificate, request, { managerCaPem: caPem, managerCaFingerprint256: String(options["ca-fingerprint"]) });
    process.stdout.write(`${resolve(String(options["identity-dir"]))}/client.cert.pem\n`);
}
