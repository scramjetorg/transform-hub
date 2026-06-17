#!/usr/bin/env node
import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateOpenApi } from "../openapi";
import { loadManifestFromSchemaModule } from "../schema-mode";

async function main(argv: string[]) {
    const [input, output] = argv;

    if (!input) {
        throw new Error("Usage: scramjet-api-router-generate <api-definition> [output.json]");
    }

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
