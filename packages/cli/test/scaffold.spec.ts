import test from "ava";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { resolveSequenceTemplate, scaffoldSequence } from "../src/lib/helpers/scaffold";

test("resolves the repository-owned template from the source checkout", t => {
    const template = resolveSequenceTemplate("node");

    t.true(template.endsWith("templates/sequences/node"));
    t.true(existsSync(join(template, "package.json")));
});

test("resolves templates staged beside a published artifact", t => {
    const root = mkdtempSync(join(tmpdir(), "scramjet-cli-artifact-"));
    const helpers = join(root, "helpers");
    const template = join(root, "templates", "sequences", "python");
    mkdirSync(helpers, { recursive: true });
    mkdirSync(template, { recursive: true });

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    t.is(resolveSequenceTemplate("python", helpers), template);
});

test("scaffolds from the same resolved template", t => {
    const target = mkdtempSync(join(tmpdir(), "scramjet-cli-scaffold-"));
    rmSync(target, { recursive: true, force: true });
    t.teardown(() => rmSync(target, { recursive: true, force: true }));

    scaffoldSequence("bun", target);

    t.true(existsSync(join(target, "package.json")));
    t.true(existsSync(join(target, "index.js")));
});
