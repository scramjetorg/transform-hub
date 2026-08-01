"use strict";

const fs = require("node:fs");
const path = require("node:path");

const GENERATED_ARCHIVE_REFERENCE = /^data\/sequences\/[^/]+-packages\/([^/]+\.tar\.gz)$/;

/**
 * Resolve a feature's generated fixture archive reference against the
 * owner-scoped directories prepared by the Docker BDD runner.
 *
 * Generated archives are intentionally outside the repository tree, so a
 * feature must not depend on an archive being present under bdd/data.
 */
function resolveFixturePackagePath(packagePath, { packagesDir = process.env.PACKAGES_DIR, exists = fs.existsSync } = {}) {
    if (exists(packagePath)) return packagePath;

    const match = packagePath.match(GENERATED_ARCHIVE_REFERENCE);
    if (!match || !packagesDir) return packagePath;

    for (const directory of packagesDir.split(path.delimiter).map((entry) => entry.trim()).filter(Boolean)) {
        const candidate = path.join(directory, match[1]);
        if (exists(candidate)) return candidate;
    }

    return packagePath;
}

module.exports = { resolveFixturePackagePath };
