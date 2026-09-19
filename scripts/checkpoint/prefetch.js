#!/usr/bin/env node
const { prefetchRuntimeDependencies } = require("./runtime-dependencies.js");

async function main() {
    const index = process.argv.indexOf("--output");
    if (index < 0 || !process.argv[index + 1]) throw new Error("Usage: prefetch.js --output <directory>");
    const manifest = await prefetchRuntimeDependencies({ output: process.argv[index + 1] });
    console.log(`Runtime dependency manifest: ${manifest.profileDigest}`);
}

if (require.main === module) main().catch((error) => { console.error(`[checkpoint] ${error.message}`); process.exitCode = 1; });

module.exports = { main };
