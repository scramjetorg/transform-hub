"use strict";

module.exports = {
    exclude: ["**/types/**", "**/types.ts"],
    extends: "@istanbuljs/nyc-config-typescript",
    all: true, // Whether or not to instrument all files (not just the ones touched by your test suite)
    "report-dir": "./coverage", // Where to put the coverage report files
    include: "packages/**",
    reporter: [
        "html",
        // "text",
        "text-summary"
    ]
};
