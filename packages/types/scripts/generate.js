#!/usr/bin/env node

const { resolve } = require("path");
const { createWriteStream } = require("fs");
const { readdir } = require("fs").promises;


(async () => {
    const out = createWriteStream(resolve(__dirname, "../test/.work/generated_test.ts"));
    const list = await readdir(resolve(__dirname, "../test/"));

    out.write("/// Generated file, do not edit!\n\n");

    for (let file of list) {
        if (!file.endsWith(".spec.ts")) continue;
        const importName = file.replace(/\.spec\.ts$/, "");
        const filename = file.replace(/\.ts$/, "");

        out.write(`import * as ${importName} from "../${filename}";\nexport { ${importName} };\n`);
    }

    out.end();
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
