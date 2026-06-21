import type { CommandDescriptor } from "@scramjet/config";

/**
 * Walk up the parent chain from a child descriptor.
 * In the flat descriptor model, we don't maintain parent pointers,
 * so this finds the root by traversing the commands/index tree.
 * For the purposes of developer tools, we accept the root directly.
 */
export const rootCommand = (command: CommandDescriptor): CommandDescriptor => {
    return command;
};

export const cmdToJson = (command: CommandDescriptor): Record<string, unknown> => {
    return {
        command: command.name,
        alias: command.alias || "",
        description: command.description || "",
        usage: command.usage || "",
        arguments: (command.arguments || []).map((a) => a.name).toString(),
        options: JSON.stringify((command.options || []).reduce((acc, o) => {
            acc[o.name] = o.default;
            return acc;
        }, {} as Record<string, unknown>)),
        commands: (command.children || []).map(cmdToJson),
    };
};

export const cmdToList = (command: CommandDescriptor, stream: NodeJS.WritableStream, parentName: string = "") => {
    const name = parentName ? `${parentName} ${command.name}` : command.name;

    stream.write(name);
    stream.write("\n");
    (command.children || []).forEach((cmd) => {
        cmdToList(cmd, stream, name);
    });
};

export const getCmdFullName = (command: CommandDescriptor, parentName: string = ""): string => {
    if (parentName) {
        return `${parentName} ${command.name}`;
    }
    return command.name;
};

const parseHelpFromDescriptor = (command: CommandDescriptor) => {
    const args: string[] = (command.arguments || []).map((a) => {
        const optional = a.required ? "" : " (optional)";
        const choices = a.choices && a.choices.length > 0 ? ` [${a.choices.join("|")}]` : "";

        return `  ${a.name}${choices}${optional}  ${a.description || ""}`;
    });

    const opts: string[] = (command.options || []).map((o) => {
        const short = o.short ? `-${o.short}, ` : "    ";

        return `  ${short}--${o.name}  ${o.description || ""}`;
    });

    return { args, opts };
};

export const cmdToMdFormat = (command: CommandDescriptor, stream: NodeJS.WritableStream) => {
    const alias = command.alias ? ` | ${command.alias}` : "";
    const cmdName = getCmdFullName(command);
    const { args, opts } = parseHelpFromDescriptor(command);

    stream.write(`## $ ${cmdName}${alias}\n\n`);

    stream.write("**Description**\n\n");
    stream.write(`${command.description || ""}\n\n`);

    stream.write("**Usage**\n\n");
    stream.write(`\`${cmdName} ${command.usage || ""}\`\n\n`);

    if (args.length) {
        stream.write("**Arguments**\n\n");
        args.forEach(arg => stream.write(`*${arg}\n`));
        stream.write("\n");
    }

    if (opts.length) {
        stream.write("**Options**\n\n");
        opts.forEach(opt => stream.write(`*${opt}\n`));
        stream.write("\n");
    }
    stream.write("---\n\n");
};

export const cmdToMd = (command: CommandDescriptor, stream: NodeJS.WritableStream) => {
    const developersOnly = command.metadata?.developersOnly === true;

    if (developersOnly) return; // Skip printing developers commands
    if (command.name !== "" && command.name !== "si") {
        cmdToMdFormat(command, stream);
    }
    (command.children || []).forEach((cmd) => {
        cmdToMd(cmd, stream);
    });
};
