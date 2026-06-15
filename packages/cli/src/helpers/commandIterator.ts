import type { CommandDescriptor } from "@scramjet/config";

export class CommandIterator {
    command: CommandDescriptor;
    private commandParent: CommandDescriptor | null;
    private index: number;

    constructor(command: CommandDescriptor) {
        this.command = command;
        this.commandParent = null;
        this.index = 0;
    }
    root() {
        while (this.commandParent) {
            // Walk up - in our flat model we just track the initial root
            if (!this.commandParent) break;
        }
        this.commandParent = null;
        this.index = 0;

        return this;
    }
    childrenCount() {
        return (this.command.children || []).length;
    }
    hasChildren() {
        return this.childrenCount() > 0;
    }
    firstChild() {
        this.commandParent = this.command;
        this.command = (this.command.children || [])[0];
        this.index = 0;
        return this;
    }
    valid() {
        if (this.command === undefined) return false;
        if (this.commandParent === null) return this.index === 0;
        return this.index < (this.commandParent.children || []).length;
    }
    next() {
        this.command = (this.commandParent!.children || [])[this.index + 1];
        this.index += 1;
        return this;
    }
}
