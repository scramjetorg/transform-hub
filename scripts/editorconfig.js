#!/usr/bin/env node

// This script regenerates editorconfig based on eslint rules.

const transform = require("eslint-to-editorconfig");
const { ESLint } = require("eslint");
const { resolve } = require("path");
const { writeFile } = require("fs/promises");

(async () => {
    const { rules } = await new ESLint({ cwd: resolve(__dirname, "../") })
        .calculateConfigForFile(".eslintrc");
    // Transform them into EditorConfig rules
    const editorConfigRules = transform(rules);

    editorConfigRules.end_of_line = "lf";
    editorConfigRules.charset = "utf-8";
    editorConfigRules.root = "true";

    await writeFile(
        resolve(__dirname, "../.editorconfig.json"),
        JSON.stringify(editorConfigRules, null, 2)
    );
})()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 10;
    });
