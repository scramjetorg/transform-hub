import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { cmd, executeCommand, generateHelp, getDefaultManagerConfig, loadConfig, parseCommandContext, resolveCommandPath, z, type CommandDescriptor } from "@scramjet/config";
import type { CsrEnrollmentRequest } from "@scramjet/runtime-types";
import { CsrEnrollmentAuthority } from "./csr-enrollment";

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

const stringOption = (name: string, description: string) => ({ name, flag: name, type: "string" as const, required: true, description });

export function createManagerCsrEnrollmentCommand(): CommandDescriptor {
    return cmd("manager-csr-enrollment", (root) =>
        root
            .desc("Local Manager CSR enrollment approval")
            .children(
                cmd("approve", (command) =>
                    command
                        .desc("Approve a CSR locally and write a protected one-time grant")
                        .option(stringOption("manager-config", "Loaded Manager configuration file"))
                        .option(stringOption("request", "CSR request file"))
                        .option(stringOption("operator-approval-file", "Protected exact operator approval file"))
                        .option(stringOption("grant-output", "Protected one-time grant output file"))
                        .action((options) => approve(options))
                )
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
