import { Command } from "commander";
import { ExtendedHelpConfiguration } from "../../types";

export const rootCommand = (command: Command) => {
    while (command.parent !== null) {
        command = command.parent;
    }
    return command as Command;
};

export const cmdToJson = (command: Command) => {
    return {
        command: command.name(),
        alias: command.alias(),
        description: command.description(),
        usage: command.usage(),
        arguments: command.args.toString(),
        options: JSON.stringify(command.opts()),
        commands: command.commands.map(cmdToJson as any),
    };
};

export const cmdToList = (command: Command, stream: NodeJS.WritableStream, parentName: string = "") => {
    const name = parentName ? `${parentName} ${command.name()}` : command.name();

    stream.write(name);
    stream.write("\n");
    command.commands.forEach(cmd => {
        cmdToList(cmd, stream, name);
    });
};

export const getCmdFullName = (command: Command) => {
    let name = command.name();

    while (command.parent !== null) {
        command = command.parent;
        name = `${command.name()} ${name}`;
    }
    return name;
};

const parseHelp = (command: Command) => {
    let help = "";

    command.configureOutput({ writeOut: (str) => { help += str; } });
    command.outputHelp();

    const argumentsStart = help.indexOf("Arguments:\n");
    let argumentsEnd: number, optionsEnd: number;
    let args: string[] = [];
    let opts: string[] = [];

    if (argumentsStart !== -1) {
        argumentsEnd = help.indexOf("\n\n", argumentsStart);
        if (argumentsEnd !== -1)
            args = help.slice(argumentsStart + 11, argumentsEnd).split("\n");
    }

    const optionsStart = help.indexOf("Options:\n");

    if (optionsStart !== -1) {
        optionsEnd = help.indexOf("\n\n", optionsStart);
        if (optionsEnd !== -1)
            opts = help.slice(optionsStart + 9, optionsEnd).split("\n");
    }

    return { args, opts };
};

export const cmdToMdFormat = (command: Command, stream: NodeJS.WritableStream) => {
    const alias = command.alias() ? ` | ${command.alias()}` : "";
    const cmdName = getCmdFullName(command);
    const { args, opts } = parseHelp(command);

    stream.write(`## $ ${cmdName}${alias}\n\n`);

    stream.write("**Description**\n\n");
    stream.write(`${command.description()}\n\n`);

    stream.write("**Usage**\n\n");
    stream.write(`\`${cmdName} ${command.usage()}\`\n\n`);

    if (args.length) {
        stream.write("**Arguments**\n\n");
        args.forEach(arg => stream.write(`*${arg}\n`));
        // stream.write(args);
        stream.write("\n");
    }

    if (opts.length) {
        stream.write("**Options**\n\n");
        opts.forEach(opt => stream.write(`*${opt}\n`));
        stream.write("\n");
    }
    stream.write("---\n\n");
};

export const cmdToMd = (command: Command, stream: NodeJS.WritableStream) => {
    const { developersOnly } = command.configureHelp() as ExtendedHelpConfiguration;

    if (developersOnly) return; // Skip printing developers commands

    if (command.parent !== null)
        cmdToMdFormat(command, stream);
    command.commands.forEach(cmd => {
        cmdToMd(cmd, stream);
    });
};

