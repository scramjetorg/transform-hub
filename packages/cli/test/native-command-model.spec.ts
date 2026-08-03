import baseTest from "ava";
const { createAvaMemoryGuard } = require("../../../scripts/lib/ava-memory-guard");
const test: typeof baseTest = createAvaMemoryGuard(baseTest);
import { cmd, executeCommand, generateHelp, parseCommandContext, resolveCommandPath } from "@scramjet/config";
import { CommandCompleter } from "../src/handlers/completion/commandCompleter";
import { completionCommand } from "../src/lib/commands/completion";

test("native command model resolves nested command paths and aliases", t => {
    const root = cmd("si", b => b.children(
        cmd("config", c => c.alias("c").children(
            cmd("profile", p => p.alias("pr").children(
                cmd("use", u => u.argument("<name>").action(() => undefined))
            ))
        ))
    ));

    const resolved = resolveCommandPath(["c", "pr", "use", "default"], root);

    t.is(resolved.command.name, "use");
    t.deepEqual(resolved.consumed, ["si", "c", "pr", "use"]);
    t.deepEqual(resolved.remainder, ["default"]);
});

test("native command model parses positional args and dashed options", async t => {
    const calls: unknown[][] = [];
    const root = cmd("si", b => b.children(
        cmd("topic", topic => topic.children(
            cmd("send", send => send
                .argument("<topic-name>")
                .argument("[file]")
                .option("-t, --content-type [content-type]", "Content-Type")
                .option("--scope <scope>", "Topic scope")
                .action((topicName: string, file: string, options: Record<string, unknown>) => {
                    calls.push([topicName, file, options]);
                })
            )
        ))
    ));

    const resolved = resolveCommandPath(["topic", "send", "orders", "orders.ndjson", "--content-type", "application/x-ndjson", "--scope", "space"], root);
    const context = parseCommandContext(resolved);

    await executeCommand(context);

    t.deepEqual(calls, [["orders", "orders.ndjson", { contentType: "application/x-ndjson", scope: "space" }]]);
});

test("native command model keeps option values out of positional args", t => {
    const root = cmd("si", b => b.children(
        cmd("sequence", sequence => sequence.children(
            cmd("start", start => start
                .argument("<id>")
                .option("-f, --config-file <path-to-file>", "Config file")
                .option("--args <json-string>", "Args")
            )
        ))
    ));

    const resolved = resolveCommandPath(["sequence", "start", "seq-1", "--config-file", "config.json", "--args", "[1]"], root);
    const context = parseCommandContext(resolved);

    t.deepEqual(context.args, ["seq-1"]);
    t.deepEqual(context.options, { configFile: "config.json", args: "[1]" });
});

test("native command model treats dash placeholder as positional arg", t => {
    const root = cmd("si", b => b.children(
        cmd("sequence", sequence => sequence.children(
            cmd("start", start => start.argument("<id>"))
        ))
    ));

    const resolved = resolveCommandPath(["sequence", "start", "-"], root);
    const context = parseCommandContext(resolved);

    t.deepEqual(context.args, ["-"]);
});

test("native command model parses negated boolean options", t => {
    const root = cmd("si", b => b.children(
        cmd("util", util => util.children(
            cmd("log-format", logFormat => logFormat.option("--no-color", "Do not colorize the values"))
        ))
    ));

    const resolved = resolveCommandPath(["util", "log-format", "--no-color"], root);
    const context = parseCommandContext(resolved);

    t.deepEqual(context.options, { color: false });
});

test("native completion returns subcommands, options, and completer metadata", t => {
    const root = cmd("si", b => b.children(
        cmd("topic", topic => topic.children(
            cmd("send", send => send
                .argument("<topic-name>")
                .argument("[file]")
                .option("-t, --content-type [content-type]", "Content-Type")
                .completer({ file: "filenames" })
            ),
            cmd("list", list => list.alias("ls"))
        ))
    ));

    const completer = new CommandCompleter(root);

    t.deepEqual(completer.complete(["si", "topic", ""], 2), ["send", "list"]);
    t.deepEqual(completer.complete(["si", "topic", "send", "orders", ""], 4), "filenames");
    t.deepEqual(completer.complete(["si", "topic", "send", "orders", "--"], 4), ["--content-type"]);
});

test("completion script output is a side-effect-free command leaf", t => {
    t.truthy(completionCommand.action);
    t.true(completionCommand.children?.some(child => child.name === "install"));
    t.true(completionCommand.children?.some(child => child.name === "uninstall"));
    t.regex(generateHelp(completionCommand), /install/);
});
