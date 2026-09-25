#!/usr/bin/env node
import { writeFileSync } from "fs";
import { resolve } from "path";

const importModule = (path: string) => import(path);

if (process.argv.slice(2).some(argument => argument === "--help" || argument === "-h")) {
    process.stdout.write([
        "Usage: scramjet-api-router-generate <api-definition> [output.json]",
        "",
        "Generate an OpenAPI document from a Scramjet API definition module.",
        "",
        "Arguments:",
        "  api-definition  Path to the API definition module",
        "  output.json (optional)  Optional output file; stdout is used when omitted",
        ""
    ].join("\n"));
    process.exit(0);
}

async function main(argv: string[]) {
    const [input, output] = argv;

    if (!input) {
        throw new Error("Usage: scramjet-api-router-generate <api-definition> [output.json]");
    }

    const [{ generateOpenApi }, { loadManifestFromSchemaModule }] = await Promise.all([
        importModule("../../dist/openapi.js"),
        importModule("../../dist/schema-mode.js")
    ]);
    const module = await import(resolve(input));
    const document = generateOpenApi(loadManifestFromSchemaModule(module));
    const json = `${JSON.stringify(document, null, 2)}\n`;

    if (output) {
        writeFileSync(output, json);
    } else {
        process.stdout.write(json);
    }
}

main(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
