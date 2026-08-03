import test from "ava";
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { x } from "tar";
import { sequencePack } from "../src/lib/helpers/sequence";

test("sequencePack applies .siignore minimatch rules", async t => {
    const root = mkdtempSync(join(tmpdir(), "scramjet-cli-pack-"));
    const source = join(root, "source");
    const extracted = join(root, "extracted");
    const archive = join(root, "sequence.tar.gz");

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(source);
    mkdirSync(extracted);
    writeFileSync(join(source, "package.json"), JSON.stringify({ name: "sequence" }));
    writeFileSync(join(source, "included.txt"), "included");
    writeFileSync(join(source, "ignored.tmp"), "ignored");
    writeFileSync(join(source, ".siignore"), "*.tmp\n");

    await sequencePack(source, { output: createWriteStream(archive) });
    await x({ cwd: extracted, file: archive });

    t.true(existsSync(join(extracted, "included.txt")));
    t.false(existsSync(join(extracted, "ignored.tmp")));
});
