import test from "ava";
import { cmd, CommandUsageError, generateHelp, parseCommandContext, resolveCommandPath } from "../src/command-model";

function tree() {
    return cmd("tool", root => {
        root.children(cmd("run", run => {
            run.option({ name: "input", type: "string", required: true });
            run.option({ name: "verbose", type: "boolean" });
            run.argument({ name: "value", required: true });
        }));
    });
}

function parse(argv: string[]) {
    const root = tree();
    return parseCommandContext(resolveCommandPath(["tool", ...argv], root));
}

test("command model rejects unknown subcommands and options", t => {
    const unknownCommand = t.throws(() => resolveCommandPath(["tool", "SECRET-SUBCOMMAND"], tree()), { instanceOf: CommandUsageError });
    t.false(unknownCommand.message.includes("SECRET-SUBCOMMAND"));
    const unknownOption = t.throws(() => parse(["run", "--unknown=SECRET", "x", "value"]), { instanceOf: CommandUsageError });
    t.false(unknownOption.message.includes("SECRET"));
});

test("command model rejects surplus positional arguments", t => {
    t.throws(() => parse(["run", "--input", "file", "value", "extra"]), { message: /Unexpected positional/ });
});

test("command model rejects missing required options", t => {
    t.throws(() => parse(["run", "value"]), { message: /Missing required option.*input/ });
});

test("command model rejects duplicate scalar options but permits arrays", t => {
    const duplicate = t.throws(() => parse(["run", "--input", "a", "--input", "SECRET", "value"]), { instanceOf: CommandUsageError });
    t.false(duplicate.message.includes("SECRET"));
    const root = cmd("tool", command => command.children(cmd("run", run => run.option({ name: "tag", type: "string[]" }))));
    const context = parseCommandContext(resolveCommandPath(["tool", "run", "--tag", "a", "--tag", "b"], root));
    t.deepEqual(context.options.tag, ["a", "b"]);
});

test("command model reports missing values and invalid choices safely", t => {
    const missing = t.throws(() => parse(["run", "--input", "--SECRET", "value"]), { instanceOf: CommandUsageError });
    t.false(missing.message.includes("SECRET"));
    const root = cmd("tool", command => command.children(cmd("choose", choose => choose.argument({ name: "mode", required: true, choices: ["safe", "fast"] }))));
    const invalid = t.throws(() => parseCommandContext(resolveCommandPath(["tool", "choose", "SECRET"], root)), { instanceOf: CommandUsageError });
    t.false(invalid.message.includes("SECRET"));
});

test("command model identifies controlled usage errors and renders full paths", t => {
    const root = tree();
    const resolved = resolveCommandPath(["tool", "run"], root);
    t.throws(() => parseCommandContext(resolved), { instanceOf: CommandUsageError });
    t.regex(generateHelp(resolved.command, resolved.path.map(command => command.name).join(" ")), /^Usage: tool run /);
});

test("command model sanitizes invalid JSON coercion without echoing input", t => {
    const root = cmd("tool", command => command.children(cmd("load", load => {
        load.option({ name: "config", type: "json" });
    })));

    const err = t.throws(
        () => parseCommandContext(resolveCommandPath(["tool", "load", "--config=SECRET_JSON_INPUT"], root)),
        { instanceOf: CommandUsageError }
    );
    t.false(err.message.includes("SECRET_JSON_INPUT"));
    t.true(err.message.includes("JSON"));
});

test("command model rejects non-finite number[] values with sanitized error", t => {
    const root = cmd("tool", command => command.children(cmd("scale", scale => {
        scale.option({ name: "count", type: "number[]" });
    })));

    const errNaN = t.throws(
        () => parseCommandContext(resolveCommandPath(["tool", "scale", "--count=SECRET_NAN"], root)),
        { instanceOf: CommandUsageError }
    );
    t.false(errNaN.message.includes("SECRET_NAN"));

    const errInf = t.throws(
        () => parseCommandContext(resolveCommandPath(["tool", "scale", "--count=Infinity"], root)),
        { instanceOf: CommandUsageError }
    );
    t.true(errInf.message.includes("number"));
});
