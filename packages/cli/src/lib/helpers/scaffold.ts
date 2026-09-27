import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { dirname, join, resolve } from "path";

export type ScaffoldLanguage = "node" | "python" | "bun";

export function normalizeScaffoldLanguage(language: string | undefined): ScaffoldLanguage {
    switch ((language || "node").toLowerCase()) {
        case "node":
        case "js":
            return "node";
        case "python":
        case "py":
            return "python";
        case "bun":
            return "bun";
        case "ts":
        case "typescript":
            throw new Error("TypeScript sequence scaffolding is not supported; use node instead.");
        default:
            throw new Error(`Unsupported sequence language: ${language}`);
    }
}

/** Locate templates both in a source checkout and in the published CLI package. */
export function resolveSequenceTemplate(language: ScaffoldLanguage, moduleDirectory = __dirname): string {
    const candidates = [
        // Published artifacts place the staged templates next to compiled helpers.
        resolve(moduleDirectory, "../templates/sequences", language),
        resolve(moduleDirectory, "../../templates/sequences", language),
        // Source checkout: templates are owned by the repository root.
        resolve(moduleDirectory, "../../../../../templates/sequences", language)
    ];
    const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isDirectory());
    if (!found) throw new Error(`Sequence template is not installed for ${language}.`);
    return found;
}

export function scaffoldSequence(languageArg: string | undefined, targetArg?: string): string {
    const language = normalizeScaffoldLanguage(languageArg);
    const target = resolve(targetArg || process.cwd());
    if (existsSync(target)) {
        if (!statSync(target).isDirectory()) throw new Error(`Scaffold target is not a directory: ${target}`);
        if (readdirSync(target).length) throw new Error(`Scaffold target must be missing or empty: ${target}`);
    } else {
        mkdirSync(target, { recursive: true });
    }

    const template = resolveSequenceTemplate(language);
    for (const entry of readdirSync(template)) {
        const source = join(template, entry);
        const destination = join(target, entry);
        mkdirSync(dirname(destination), { recursive: true });
        cpSync(source, destination, { recursive: true, errorOnExist: true });
    }
    return target;
}
