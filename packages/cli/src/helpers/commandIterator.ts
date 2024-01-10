import { Command } from "commander";

export class CommandIterator {
    command: Command;
    private commandParent: Command | null;
    private index: number;

    constructor(command: Command) {
        this.command = command;
        this.commandParent = command.parent;
        if (this.commandParent) {
            this.index = this.commandParent.commands.indexOf(this.command);
        } else this.index = 0;
    }
    root() {
        while (this.command.parent) {
            this.command = this.command.parent!;
        }
        this.commandParent = null;
        this.index = 0;

        return this;
    }
    childrenCount() {
        return this.command.commands.length;
    }
    hasChildren() {
        return this.childrenCount() > 0;
    }
    firstChild() {
        this.commandParent = this.command;
        this.command = this.command.commands[0];
        this.index = 0;
        return this;
    }
    valid() {
        if (this.command === undefined) return false;
        if (this.commandParent === null) return this.index === 0;
        return this.index < this.commandParent.commands.length;
    }
    next() {
        this.command = this.commandParent!.commands[this.index + 1];
        this.index += 1;
        return this;
    }
}
