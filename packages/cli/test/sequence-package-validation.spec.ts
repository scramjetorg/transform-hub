import test from "ava";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { validateSequencePackage } from "../src/lib/helpers/sequence-package-validation";

function fixture(packageJson: object, main = "index.js") {
    const root = mkdtempSync(join(tmpdir(), "scramjet-cli-validation-"));
    writeFileSync(join(root, "package.json"), JSON.stringify(packageJson));
    writeFileSync(join(root, main), "module.exports = async () => {};\n");
    return root;
}

test("validates the package contract", async t => {
    const root = fixture({ main: "index.js", engines: { node: ">=18" } });
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    await t.notThrowsAsync(() => validateSequencePackage(root));
});

test("reports multiple supported engines as an engines error", async t => {
    const root = fixture({ main: "index.js", engines: { node: ">=18", bun: ">=1" } });
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    await t.throwsAsync(() => validateSequencePackage(root), { message: /engines/ });
});

test("rejects an ignored entrypoint", async t => {
    const root = fixture({ main: "index.js", engines: { node: ">=18" } });
    writeFileSync(join(root, ".siignore"), "index.js\n");
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    await t.throwsAsync(() => validateSequencePackage(root), { message: /\.siignore/ });
});

test("checks declared Node dependency directories", async t => {
    const root = fixture({ main: "index.js", engines: { node: ">=18" }, dependencies: { example: "1.0.0" } });
    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    await t.throwsAsync(() => validateSequencePackage(root), { message: /dependencies/ });
    mkdirSync(join(root, "node_modules", "example"), { recursive: true });
    await t.notThrowsAsync(() => validateSequencePackage(root));
});
