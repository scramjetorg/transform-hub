import { cmd, type CommandDescriptor } from "@scramjet/config";
import { scaffoldSequence } from "../helpers/scaffold";

function sequenceScaffoldAction(language: string, options: Record<string, unknown>): void {
    scaffoldSequence(language, options.path as string | undefined);
}

const sequenceScaffoldCommand: CommandDescriptor = cmd("sequence", (c) => {
    c.alias("seq").argument("[language]").option("-p, --path <dir-path>", "Path to create sequence")
        .desc("Create a Sequence from an owned template").completer({ path: "dirnames" }).action(sequenceScaffoldAction);
});

export const initCommand: CommandDescriptor = cmd("init", (b) => {
    b
        .alias("i")
        .usage("[command] [options...]")
        .desc("Create all the necessary files and start working on your Sequence")
        .children(
            cmd("sequence", (c) => {
                c
                    .alias("seq")
                    .argument("[language]", "Choose the language to develop the sequence")
                    .option("-p, --path <dir-path>", "Path to create sequence")
                    .desc("Create all the necessary files and start working on your Sequence")
                    .completer({ path: "dirnames" })
                    .action(sequenceScaffoldAction);
            })
        );
});

export const scaffoldCommand: CommandDescriptor = cmd("scaffold", (b) => {
    b.desc("Create files for a new Sequence").children(sequenceScaffoldCommand);
});
