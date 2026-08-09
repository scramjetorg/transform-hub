import { cmd, type CommandDescriptor } from "@scramjet/config";
import { Completion } from "../../handlers/completion";

/**
 * Builds the `completion` command descriptor.
 * When running in completion script context, `si completion` calls Completion.complete()
 * which uses the root descriptor from commands/index.
 * We accept the root as a parameter since we need access to the full tree.
 */
export const completionCommand: CommandDescriptor = cmd("completion", (b) => {
    b
        .desc("Completion operations")
        .action(Completion.script)
        .children(
            cmd("install", (c) => {
                c
                    .desc("Installs bash completion script")
                    .action(Completion.install);
            }),
            cmd("uninstall", (c) => {
                c
                    .desc("Uninstalls bash completion script")
                    .action(Completion.uninstall);
            })
        );
});
