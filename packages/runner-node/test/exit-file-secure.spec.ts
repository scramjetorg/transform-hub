import test from "ava";
import { mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync, existsSync, unlinkSync, lstatSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { legacyExitFilePath, writeLegacyExitFileSecure } from "../src/bin/runner-node";

test("legacyExitFilePath returns /tmp/runner-<pid> for adapter compatibility", t => {
    t.is(legacyExitFilePath(1234), "/tmp/runner-1234");
    t.is(legacyExitFilePath(), `/tmp/runner-${process.pid}`);
});

test("writeLegacyExitFileSecure creates file with 0o600 and writes the code", t => {
    const dir = mkdtempSync(join(tmpdir(), "rn-exit-"));
    const path = join(dir, "exit");

    t.true(writeLegacyExitFileSecure(path, 0));
    t.is(readFileSync(path, "utf8"), "0");

    const mode = statSync(path).mode & 0o777;

    t.is(mode, 0o600);
});

test("writeLegacyExitFileSecure refuses to overwrite a pre-existing file", t => {
    const dir = mkdtempSync(join(tmpdir(), "rn-exit-"));
    const path = join(dir, "exit");

    writeFileSync(path, "ATTACKER");

    t.false(writeLegacyExitFileSecure(path, 0));
    t.is(readFileSync(path, "utf8"), "ATTACKER");
});

test("writeLegacyExitFileSecure refuses to follow a symlink and does not touch the target", t => {
    const dir = mkdtempSync(join(tmpdir(), "rn-exit-"));
    const target = join(dir, "target");
    const link = join(dir, "link");

    writeFileSync(target, "ORIGINAL");
    symlinkSync(target, link);

    t.false(writeLegacyExitFileSecure(link, 0));
    t.is(readFileSync(target, "utf8"), "ORIGINAL");
    t.true(lstatSync(link).isSymbolicLink());
});

test("writeLegacyExitFileSecure does not throw when the directory is missing", t => {
    const path = join(tmpdir(), "rn-exit-does-not-exist-dir", "exit");

    t.notThrows(() => writeLegacyExitFileSecure(path, 0));
    t.false(existsSync(path));
});

test("writeLegacyExitFileSecure logs via provided logger on failure", t => {
    const dir = mkdtempSync(join(tmpdir(), "rn-exit-"));
    const path = join(dir, "exit");
    const warned: unknown[][] = [];

    writeFileSync(path, "pre");

    const ok = writeLegacyExitFileSecure(path, 1, { warn: (...args) => warned.push(args) });

    t.false(ok);
    t.is(warned.length, 1);
    unlinkSync(path);
});
