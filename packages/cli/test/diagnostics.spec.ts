import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { PassThrough } from "stream";
import { diagnostic, safePath, setDiagnosticLogging } from "../src/lib/diagnostics";

test.afterEach.always(() => setDiagnosticLogging(false));

test("diagnostics are disabled by default and write only to the supplied stderr stream", async t => {
    const stderr = new PassThrough();
    let output = "";
    stderr.on("data", chunk => output += chunk.toString());

    setDiagnosticLogging(false, stderr);
    diagnostic("cli.startup", { credential: "must-not-appear" });
    await new Promise(resolve => setImmediate(resolve));
    t.is(output, "");

    setDiagnosticLogging(true, stderr);
    diagnostic("request.completion", { method: "GET", path: "/api/v2/items?token=<redacted>", body: "must-not-be-logged" });
    await new Promise(resolve => setImmediate(resolve));
    t.regex(output, /request\.completion/);
    t.false(output.includes("must-not-be-logged"));
});

test("diagnostic paths redact query values", t => {
    t.is(safePath("/api/v2/items?token=secret&space=public&space=other"), "/api/v2/items?token=%3Credacted%3E&space=%3Credacted%3E");
});
