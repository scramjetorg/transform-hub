import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export type SequenceFixtureFiles = Record<string, string | Buffer>;

export interface SequenceFixtureOptions {
    prefix?: string;
    sequenceFile?: string;
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

export async function createSequenceFixture(
    files: SequenceFixtureFiles,
    options: SequenceFixtureOptions = {}
): Promise<SequenceFixture> {
    const sequenceFile = options.sequenceFile ?? "index.js";

    assertRelativeFixturePath(sequenceFile);

    for (const filePath of Object.keys(files)) {
        assertRelativeFixturePath(filePath);
    }

    const directory = await fs.mkdtemp(path.join(tmpdir(), options.prefix ?? "sequence-test-"));

    for (const [filePath, content] of Object.entries(files)) {
        const destination = path.join(directory, filePath);

        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, content);
    }

    return {
        directory,
        sequencePath: path.join(directory, sequenceFile),
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
