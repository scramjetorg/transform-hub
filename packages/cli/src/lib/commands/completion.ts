import { readFileSync } from "fs";
import { resolve } from "path";
import { promisify } from "util";
import { CommandDefinition } from "../../types";
import { displayMessage } from "../output";
const exec = promisify(require("child_process").exec);

const bashCompletionPath = resolve(__dirname, "../../completion/si");

/**
 * Initializes `completion` command.
 *
 * @param {Command} program Commander object.
 */
export const completion: CommandDefinition = (program) => {
    /**
     * Set custom value for config and write it to JSON file.
    */
    const completionCmd = program
        .command("completion")
        .addHelpCommand(false)
        .description("completion operations")
        .action(function() {
            if (!process.env.COMP_LINE || !process.env.COMP_POINT) {
                throw new Error("COMP_ variables are nonexistent. Did you mean si completion install?");
            }
            program.complete({
                line: process.env.COMP_LINE,
                cursor: process.env.COMP_POINT
            });
        });

    /**
    * Command: `si completion bash`
    * Prints the bash completion script
    */
    completionCmd.command("bash")
        .description("Print out bash completion script")
        .action(() => displayMessage(readFileSync(bashCompletionPath, { encoding: "utf8", flag: "r" })));

    /**
    * Command: `si completion install`
    * Installs bash completion script in .bashrc
    */
    completionCmd.command("install")
        .description("Installs bash completion script in .bashrc")
        .action(async () => {
            await exec("bash -c 'si completion bash >>$HOME/.bashrc'");
            displayMessage("Scramjet CLI completion installed in .bashrc. Please run source ~/.bashrc for immediate effect.");
        });
};
