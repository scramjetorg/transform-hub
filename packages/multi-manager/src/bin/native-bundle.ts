#!/usr/bin/env ts-node
import { encodeVerser2ConnectionBundle } from "@scramjet/config";
import { MultiManagerConfig } from "../config/multi-manager-configuration";
import { createMultiManagerNativeBundle, NativeBundleOptions } from "../lib/verser2-trust-export";

function parse(argv: string[]): { config: string; format: "json" | "command"; options: NativeBundleOptions } {
    const values: Record<string, string> = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (!arg.startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Invalid option: ${arg}`);
        values[arg.slice(2)] = argv[++i];
    }
    if (!values.config || !values["profile-name"]) throw new Error("--config and --profile-name are required");
    if (!values["broker-id"]) throw new Error("--broker-id is required");
    if (values.principal && values.principal !== "si" && values.principal !== "sth") throw new Error("--principal must be si or sth");
    if (values.format && values.format !== "json" && values.format !== "command") throw new Error("--format must be json or command");
    const allowed = new Set(["config", "profile-name", "broker-id", "principal", "space", "hub", "client-cert-file", "client-key-file", "client-pfx-file", "passphrase-reference", "format"]);
    for (const key of Object.keys(values)) if (!allowed.has(key)) throw new Error(`Unknown option: --${key}`);
    return { config: values.config, format: (values.format || "json") as "json" | "command", options: {
        profileName: values["profile-name"], brokerId: values["broker-id"], principal: (values.principal || "si") as "si" | "sth", space: values.space, hub: values.hub,
        clientCertFile: values["client-cert-file"], clientKeyFile: values["client-key-file"], clientPfxFile: values["client-pfx-file"], passphraseReference: values["passphrase-reference"]
    } };
}

export async function runNativeBundle(argv: string[]): Promise<string> {
    const parsed = parse(argv);
    const config = new MultiManagerConfig({ config: parsed.config, colors: true, dumpHeap: 0, logLevel: "TRACE", s3AccessKeyId: "", s3SecretAccessKey: "" });
    const bundle = await createMultiManagerNativeBundle(config.get(), parsed.options);
    const json = encodeVerser2ConnectionBundle(bundle);
    if (parsed.format === "json") return json;
    return `si config native import --bundle ${Buffer.from(json, "utf8").toString("base64url")}`;
}

if (require.main === module) {
    runNativeBundle(process.argv.slice(2)).then(output => process.stdout.write(`${output}\n`)).catch(error => {
        process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
        process.exitCode = 1;
    });
}
