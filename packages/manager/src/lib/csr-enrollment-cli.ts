import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { cmd, executeCommand, generateHelp, getDefaultManagerConfig, loadConfig, parseCommandContext, resolveCommandPath, z, type CommandDescriptor } from "@scramjet/config";
import type { CsrEnrollmentRequest } from "@scramjet/runtime-types";
import { CsrEnrollmentAuthority } from "./csr-enrollment";
import { CsrEnrollmentV2Issuer } from "./csr-enrollment-v2";

function readJson<T>(file: string): T {
    if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error("Input file is missing or unsafe");
    return JSON.parse(readFileSync(file, "utf8")) as T;
}

function protectedWrite(file: string, value: unknown): void {
    const parent = dirname(file);
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    if (lstatSync(parent).isSymbolicLink()) throw new Error("Output directory must not be a symlink");
    chmodSync(parent, 0o700);
    const partial = `${file}.partial-${process.pid}`;
    try {
        writeFileSync(partial, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
        chmodSync(partial, 0o600);
        renameSync(partial, file);
    } finally {
        rmSync(partial, { force: true });
    }
}

function secret(file: string): string {
    if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error("Secret file is missing or unsafe");
    return readFileSync(file, "utf8").trim();
}

function authorityFromConfig(file: string): CsrEnrollmentAuthority {
    const config = loadConfig<Record<string, any>>({
        schema: z.record(z.any()),
        defaults: getDefaultManagerConfig() as Record<string, unknown>,
        configFilePath: resolve(file)
    }).config;
    const enrollment = config.csrEnrollment;
    if (!enrollment || enrollment.enabled !== true) throw new Error("CSR enrollment is disabled in Manager configuration");
    return new CsrEnrollmentAuthority(enrollment);
}

function approve(options: Record<string, unknown>): void {
    const authority = authorityFromConfig(String(options["manager-config"]));
    const request = readJson<CsrEnrollmentRequest>(resolve(String(options.request)));
    const approval = authority.approve(request, secret(resolve(String(options["operator-approval-file"]))));
    const output = resolve(String(options["grant-output"]));
    protectedWrite(output, approval);
    process.stdout.write(`${output}\n`);
}

function v2IssuerFromConfig(file: string): CsrEnrollmentV2Issuer {
    const config = loadConfig<Record<string, any>>({ schema: z.record(z.any()), defaults: getDefaultManagerConfig() as Record<string, unknown>, configFilePath: resolve(file) }).config;
    const enrollment = config.verser2?.csrEnrollment;
    if (!enrollment?.enabled || !enrollment.issuer || !enrollment.issuedStore) throw new Error("CSR enrollment v2 is disabled or incomplete in Manager configuration");
    return new CsrEnrollmentV2Issuer(enrollment);
}

function signV2(options: Record<string, unknown>): void {
    const request = readJson<any>(resolve(String(options.request)));
    const expected = readJson<any[]>(resolve(String(options["expected-registrations"])));
    const record = v2IssuerFromConfig(String(options["manager-config"])).sign(request, expected);
    const output = resolve(String(options.output));
    protectedWrite(output, record);
    process.stdout.write(`${output}\n`);
}

function revokeV2(options: Record<string, unknown>): void {
    v2IssuerFromConfig(String(options["manager-config"])).revoke(String(options.selector));
}

const stringOption = (name: string, description: string) => ({ name, flag: name, type: "string" as const, required: true, description });

export function createManagerCsrEnrollmentCommand(): CommandDescriptor {
    return cmd("manager-csr-enrollment", (root) =>
        root
            .desc("Local Manager CSR enrollment tools")
            .children(
                cmd("approve", (command) =>
                    command
                        .desc("Approve a CSR locally and write a protected one-time grant")
                        .option(stringOption("manager-config", "Loaded Manager configuration file"))
                        .option(stringOption("request", "CSR request file"))
                        .option(stringOption("operator-approval-file", "Protected exact operator approval file"))
                        .option(stringOption("grant-output", "Protected one-time grant output file"))
                        .action((options) => approve(options))
                ),
                cmd("v2", (command) => command.desc("Offline csr/v2 signing").children(
                    cmd("sign", c => c.desc("Validate, sign, and persist a public csr/v2 record")
                        .option(stringOption("manager-config", "Loaded Manager configuration file"))
                        .option(stringOption("request", "csr/v2 request file"))
                        .option(stringOption("expected-registrations", "Manager-side exact registration set JSON"))
                        .option(stringOption("output", "Public issued certificate output file"))
                        .action(options => signV2(options))),
                    cmd("revoke", c => c.desc("Revoke a public csr/v2 issued record")
                        .option(stringOption("manager-config", "Loaded Manager configuration file"))
                        .option(stringOption("selector", "Certificate fingerprint or serial"))
                        .action(options => revokeV2(options)))
                ))
            )
            .build()
    );
}

export async function runManagerCsrEnrollmentCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
    const root = createManagerCsrEnrollmentCommand();
    const resolved = resolveCommandPath([root.name, ...argv], root);
    const commandPath = resolved.path.map((command) => command.name).join(" ");
    if (argv.includes("--help") || argv.includes("-h") || (Boolean(resolved.command.children?.length) && resolved.remainder.length === 0)) {
        process.stdout.write(`${generateHelp(resolved.command, commandPath)}\n`);
        return;
    }
    await executeCommand(parseCommandContext(resolved));
}
