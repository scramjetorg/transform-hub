import test from "ava";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { c } from "tar";
import { defaultConfig } from "@scramjet/config";
import { SequenceAdapterError } from "@scramjet/model";
import { ProcessSequenceAdapter } from "../src/process-sequence-adapter";

function workspace() {
    const root = mkdtempSync(join(tmpdir(), "scramjet-process-adapter-"));
    const sequencesRoot = join(root, "sequences");
    const packagesRoot = join(root, "packages");

    mkdirSync(sequencesRoot, { recursive: true });
    mkdirSync(packagesRoot, { recursive: true });

    return { root, sequencesRoot, packagesRoot };
}

function createAdapter(sequencesRoot: string): ProcessSequenceAdapter {
    return new ProcessSequenceAdapter({
        ...defaultConfig,
        sequencesRoot
    } as any);
}

function streamOf(buffer: Buffer): Readable {
    return Readable.from([buffer]);
}

/**
 * Builds a gzip tar archive containing a valid sequence package with a nested
 * `lib/` directory and returns the raw archive bytes.
 */
async function makeSequenceArchive(packagesRoot: string): Promise<Buffer> {
    const source = join(packagesRoot, "source");
    mkdirSync(join(source, "lib"), { recursive: true });
    writeFileSync(join(source, "package.json"), JSON.stringify({
        name: "nested-sequence",
        version: "1.0.0",
        main: "index.js",
        engines: { node: "*" }
    }));
    writeFileSync(join(source, "index.js"), "module.exports = async () => {};\n");
    writeFileSync(join(source, "lib", "helper.js"), "exports.helper = true;\n");

    const archive = join(packagesRoot, "sequence.tar.gz");
    await c({ cwd: source, gzip: true, file: archive }, ["package.json", "index.js", "lib"]);
    return readFileSync(archive);
}

function tarHeader(name: string, content: Buffer): Buffer {
    const header = Buffer.alloc(512);
    header.write(name, 0, "ascii");
    header.write("0000644\0", 100, "ascii");
    header.write("0000000\0", 108, "ascii");
    header.write("0000000\0", 116, "ascii");
    header.write(content.length.toString(8).padStart(11, "0") + "\0", 124, "ascii");
    header.write("00000000000\0", 136, "ascii");
    header.write("        ", 148, "ascii"); // checksum placeholder
    header[156] = 0x30; // typeflag '0' (regular file)
    header.write("ustar\0", 257, "ascii");
    header.write("00", 263, "ascii");

    let sum = 0;
    for (let i = 0; i < header.length; i++) sum += header[i];
    header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, "ascii");
    return header;
}

function tarEntry(name: string, content: string): Buffer {
    const body = Buffer.from(content);
    const padded = Buffer.alloc(Math.ceil(body.length / 512) * 512);
    body.copy(padded);
    return Buffer.concat([tarHeader(name, body), padded]);
}

/**
 * A valid sequence archive that additionally contains a `../evil.txt` traversal
 * entry. tar 7 deterministically rejects `..` paths (TAR_ENTRY_ERROR) by
 * skipping the entry without writing outside the extraction directory.
 */
function traversalArchive(): Buffer {
    const entries = [
        tarEntry("package.json", JSON.stringify({ name: "traversal", main: "index.js", engines: { node: "*" } })),
        tarEntry("index.js", "module.exports = async () => {};\n"),
        tarEntry("../evil.txt", "escaped")
    ];
    return Buffer.concat([...entries, Buffer.alloc(1024)]);
}

test("identify extracts the full package before returning the sequence config", async t => {
    const { root, sequencesRoot, packagesRoot } = workspace();
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const adapter = createAdapter(sequencesRoot);

    const archive = await makeSequenceArchive(packagesRoot);
    const config = await adapter.identify(streamOf(archive), "seq-1");

    t.is(config.type, "process");
    t.is(config.id, "seq-1");
    t.is(config.name, "nested-sequence");
    t.is(config.entrypointPath, "index.js");
    t.deepEqual(config.engines, { node: "*" });

    // Extraction completed before identification: nested file content intact.
    t.is(readFileSync(join(sequencesRoot, "seq-1", "lib", "helper.js"), "utf8"), "exports.helper = true;\n");
});

test("identify rejects malformed input and removes the partial sequence directory", async t => {
    const { root, sequencesRoot } = workspace();
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const adapter = createAdapter(sequencesRoot);

    await t.throwsAsync(
        () => adapter.identify(streamOf(Buffer.from("this is not a tar archive at all")), "seq-bad"),
        { instanceOf: SequenceAdapterError }
    );

    t.false(existsSync(join(sequencesRoot, "seq-bad")), "partial sequence directory should be removed on failure");
});

test("identify rejects truncated gzip input deterministically", async t => {
    const { root, sequencesRoot, packagesRoot } = workspace();
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const adapter = createAdapter(sequencesRoot);

    const archive = await makeSequenceArchive(packagesRoot);
    const truncated = archive.subarray(0, 40); // gzip header only

    await t.throwsAsync(
        () => adapter.identify(streamOf(truncated), "seq-trunc"),
        { instanceOf: SequenceAdapterError }
    );

    t.false(existsSync(join(sequencesRoot, "seq-trunc")), "partial sequence directory should be removed on failure");
});

test("identify skips traversal entries without writing outside the sequence directory", async t => {
    const { root, sequencesRoot } = workspace();
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    const adapter = createAdapter(sequencesRoot);

    const config = await adapter.identify(streamOf(traversalArchive()), "seq-safe");

    t.is(config.entrypointPath, "index.js");
    t.true(existsSync(join(sequencesRoot, "seq-safe", "package.json")), "valid entries should be extracted");
    t.false(existsSync(join(sequencesRoot, "evil.txt")), "traversal entry must not escape the sequence directory");
});
