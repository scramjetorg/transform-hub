import test from "ava";
import { CommandIterator } from "../src/helpers/commandIterator";
import { cmd } from "@scramjet/config";

test("root() resets state after firstChild() — no infinite loop", t => {
    const root = cmd("parent", b => b.children(
        cmd("child1", c => c.action(() => undefined)),
        cmd("child2", c => c.action(() => undefined)),
    ));

    // Access the underlying CommandDescriptor via resolveCommandPath
    // We import cmd builder directly; CommandIterator wraps a CommandDescriptor.
    const iterator = new CommandIterator(root);

    // Start fresh
    t.is(iterator.valid(), true);
    t.is(iterator.childrenCount(), 2);
    t.is(iterator.hasChildren(), true);

    // Navigate to first child
    iterator.firstChild();
    t.is(iterator.valid(), true);
    t.is(iterator.command.name, "child1");

    // root() must return promptly (regression: no infinite loop) and reset state
    const result = iterator.root();
    t.is(result, iterator); // returns this
    t.is(iterator.valid(), true); // root with index=0 is valid
    t.is(iterator.command.name, "parent");
    t.is((iterator as any).commandParent, null);
    t.is((iterator as any).index, 0);
});

test("CommandIterator completes iteration through children", t => {
    const root = cmd("parent", b => b.children(
        cmd("child1", c => c.action(() => undefined)),
        cmd("child2", c => c.action(() => undefined)),
    ));

    const iterator = new CommandIterator(root);

    t.is(iterator.childrenCount(), 2);

    iterator.firstChild();
    t.is(iterator.command.name, "child1");
    t.is(iterator.valid(), true);

    iterator.next();
    t.is(iterator.command.name, "child2");
    t.is(iterator.valid(), true);

    iterator.next();
    t.falsy(iterator.valid()); // past end
});

test("CommandIterator root() is idempotent", t => {
    const root = cmd("root", b => b.action(() => undefined));

    const iterator = new CommandIterator(root);

    iterator.root();
    t.is((iterator as any).commandParent, null);
    t.is((iterator as any).index, 0);

    // Calling root() again is safe
    iterator.root();
    t.is((iterator as any).commandParent, null);
    t.is((iterator as any).index, 0);
});

test("CommandIterator childrenCount and hasChildren on leaf node", t => {
    const leaf = cmd("leaf", b => b.action(() => undefined));

    const iterator = new CommandIterator(leaf);

    t.is(iterator.childrenCount(), 0);
    t.is(iterator.hasChildren(), false);
});

test("CommandIterator firstChild on leaf node sets command to undefined", t => {
    const leaf = cmd("leaf", b => b.action(() => undefined));

    const iterator = new CommandIterator(leaf);

    iterator.firstChild();
    t.is(iterator.command, undefined);
    t.is(iterator.valid(), false);
});
