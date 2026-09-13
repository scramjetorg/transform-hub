#!/usr/bin/env node

/**
 * A deliberately small, build-free risk smoke for PR validation.  This file is
 * executed by the repository-pinned tsx binary; it must not grow into a BDD or
 * package-build entry point.
 */
const risk = process.argv[2];
if (!risk || !["bdd"].includes(risk)) {
    throw new Error("Usage: release-risk-smoke.ts bdd");
}

console.log(`release risk smoke: ${risk}`);
