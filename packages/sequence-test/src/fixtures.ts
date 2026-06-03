import { promises as fs } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { selectRuntimeKind } from "@scramjet/symbols";

export type SequenceFixtureFiles = Record<string, string | Buffer>;

export interface SequenceFixtureOptions {
    prefix?: string;
    sequenceFile?: string;
}

export interface SequenceFixtureMetadata {
    main: string;
    engines?: Record<string, string>;
}

export interface ResolvedSequenceFixtureMetadata extends SequenceFixtureMetadata {
    mainPath: string;
    engines: Record<string, string>;
    runtimeKind: ReturnType<typeof selectRuntimeKind>;
}

export interface SequenceFixture {
    directory: string;
    sequencePath: string;
    cleanup: () => Promise<void>;
}

function assertRelativeFixturePath(filePath: string): void {
    if (path.isAbsolute(filePath) || filePath.split(path.sep).includes("..") || filePath.includes("../")) {
        throw new Error(`Fixture file path must be relative and stay inside fixture directory: ${filePath}`);
    }
}

function isObject(value: unknown): value is Record<string, string> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeMainPath(directory: string, main: string): string {
    const absolute = path.resolve(directory, main);
    const relative = path.relative(directory, absolute);

    if (relative === "" || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(main)) {
        throw new Error(`Fixture package main path must stay inside fixture directory: ${main}`);
    }

    return absolute;
}

function validateEngines(engines: unknown): Record<string, string> {
    if (engines === undefined) {
        return { node: ">=16" };
    }

    if (!isObject(engines)) {
        throw new Error("package.json engines must be an object");
    }

    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(engines)) {
        if (typeof value !== "string") {
            throw new Error(`package.json engines.${key} must be a string`);
        }

        result[key] = value;
    }

    return result;
}

export async function resolveSequenceFixtureMetadata(directory: string): Promise<ResolvedSequenceFixtureMetadata> {
    const packageJsonPath = path.join(directory, "package.json");
    let packageJsonStats;

    try {
        packageJsonStats = await stat(packageJsonPath);
    } catch (error) {
        throw new Error(`fixture package.json not found at ${packageJsonPath}`);
    }

    if (!packageJsonStats.isFile()) {
        throw new Error(`fixture package.json is not a file: ${packageJsonPath}`);
    }

    const packageJsonRaw = await fs.readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonRaw) as SequenceFixtureMetadata & { [key: string]: unknown };

    if (typeof packageJson.main !== "string") {
        throw new Error("package.json main must be a required string");
    }

    const main = packageJson.main;

    assertRelativeFixturePath(main);

    const mainPath = normalizeMainPath(directory, main);
    const mainFile = await stat(mainPath).catch(() => {
        throw new Error(`package.json main must resolve to an existing file inside fixture directory: ${main}`);
    });

    if (!mainFile.isFile()) {
        throw new Error(`package.json main must resolve to an existing file inside fixture directory: ${main}`);
    }

    const engines = validateEngines(packageJson.engines);

    return {
        main,
        mainPath,
        engines,
        runtimeKind: selectRuntimeKind(engines)
    };
}

export async function createSequenceFixture(
    files: SequenceFixtureFiles,
    options: SequenceFixtureOptions = {}
): Promise<SequenceFixture> {
    const sequenceFile = options.sequenceFile;

    for (const filePath of Object.keys(files)) {
        assertRelativeFixturePath(filePath);
    }

    const directory = await fs.mkdtemp(path.join(tmpdir(), options.prefix ?? "sequence-test-"));

    for (const [filePath, content] of Object.entries(files)) {
        const destination = path.join(directory, filePath);

        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, content);
    }

    let resolvedSequenceFile = sequenceFile ?? "index.js";

    if (sequenceFile === undefined && Object.prototype.hasOwnProperty.call(files, "package.json")) {
        const resolvedMetadata = await resolveSequenceFixtureMetadata(directory);

        resolvedSequenceFile = resolvedMetadata.main;
    }

    assertRelativeFixturePath(resolvedSequenceFile);

    return {
        directory,
        sequencePath: path.join(directory, resolvedSequenceFile),
        cleanup: () => fs.rm(directory, { recursive: true, force: true })
    };
}

export function createNodeSequenceFixture(
    files: SequenceFixtureFiles,
    options: SequenceFixtureOptions = {}
): Promise<SequenceFixture> {
    return createSequenceFixture(files, {
        sequenceFile: "index.js",
        ...options
    });
}

export function createPythonSequenceFixture(
    files: SequenceFixtureFiles,
    options: SequenceFixtureOptions = {}
): Promise<SequenceFixture> {
    return createSequenceFixture(files, {
        sequenceFile: "sequence/main.py",
        ...options
    });
}

export function createBunSequenceFixture(
    files: SequenceFixtureFiles,
    options: SequenceFixtureOptions = {}
): Promise<SequenceFixture> {
    return createSequenceFixture(files, {
        sequenceFile: "index.js",
        ...options
    });
}
