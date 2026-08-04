import test from "ava";
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { x } from "tar";
import { sequencePack } from "../src/lib/helpers/sequence";

function packWorkspace() {
    const root = mkdtempSync(join(tmpdir(), "scramjet-cli-pack-"));
    const source = join(root, "source");
    const extracted = join(root, "extracted");
    const archive = join(root, "sequence.tar.gz");

    mkdirSync(source);
    mkdirSync(extracted);

    return { root, source, extracted, archive };
}

test("sequencePack applies .siignore minimatch rules", async t => {
    const { root, source, extracted, archive } = packWorkspace();

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(source, "package.json"), JSON.stringify({ name: "sequence" }));
    writeFileSync(join(source, "included.txt"), "included");
    writeFileSync(join(source, "ignored.tmp"), "ignored");
    writeFileSync(join(source, ".siignore"), "*.tmp\n");

    await sequencePack(source, { output: createWriteStream(archive) });
    await x({ cwd: extracted, file: archive });

    t.true(existsSync(join(extracted, "included.txt")));
    t.false(existsSync(join(extracted, "ignored.tmp")));
});

test("sequencePack produces a gzip-compressed archive", async t => {
    const { root, source, extracted, archive } = packWorkspace();

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(source, "package.json"), JSON.stringify({ name: "sequence" }));
    writeFileSync(join(source, "index.js"), "module.exports = async () => {};\n");

    await sequencePack(source, { output: createWriteStream(archive) });

    // gzip magic bytes: 0x1f 0x8b
    const header = readFileSync(archive).subarray(0, 2);
    t.deepEqual([...header], [0x1f, 0x8b], "sequencePack output should be gzip compressed");

    await x({ cwd: extracted, file: archive });
    t.true(existsSync(join(extracted, "index.js")));
});

test("sequencePack includes nested directory paths", async t => {
    const { root, source, extracted, archive } = packWorkspace();

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(source, "package.json"), JSON.stringify({ name: "sequence" }));
    writeFileSync(join(source, "index.js"), "module.exports = async () => {};\n");
    mkdirSync(join(source, "lib"));
    writeFileSync(join(source, "lib", "helper.js"), "exports.helper = true;\n");

    await sequencePack(source, { output: createWriteStream(archive) });
    await x({ cwd: extracted, file: archive });

    t.true(existsSync(join(extracted, "lib", "helper.js")));
    t.is(readFileSync(join(extracted, "lib", "helper.js"), "utf8"), "exports.helper = true;\n");
});

test("sequencePack filter and nested paths combine", async t => {
    const { root, source, extracted, archive } = packWorkspace();

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(source, "package.json"), JSON.stringify({ name: "sequence" }));
    mkdirSync(join(source, "src"));
    writeFileSync(join(source, "src", "keep.js"), "module.exports = 1;\n");
    writeFileSync(join(source, "src", "drop.tmp"), "ignored");
    writeFileSync(join(source, ".siignore"), "**/*.tmp\n");

    await sequencePack(source, { output: createWriteStream(archive) });
    await x({ cwd: extracted, file: archive });

    t.true(existsSync(join(extracted, "src", "keep.js")));
    t.false(existsSync(join(extracted, "src", "drop.tmp")));
});
