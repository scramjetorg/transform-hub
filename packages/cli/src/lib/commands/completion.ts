import { readFileSync } from "fs";
import { resolve } from "path";
import { promisify } from "util";
import { CommandDefinition } from "../../types";
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
        .description("completion operations")
        .action(function() {
            if (!process.env.COMP_LINE || !process.env.COMP_POINT) {
                console.log("COMP_ variables are nonexistent. Did you mean si completion install?"); //eslint-disable-line
            } else {
                program.complete({
                    line: process.env.COMP_LINE,
                    cursor: process.env.COMP_POINT
                });
            }
        });

    /**
    * Command: `si completion bash`
    * Prints the bash completion script
    */
    completionCmd.command("bash")
        .description("Print out bash completion script")
        .action(() => console.log(readFileSync(bashCompletionPath, {encoding:"utf8", flag:"r"}))); //eslint-disable-line

    /**
    * Command: `si completion install`
    * Installs bash completion script in .bashrc
    */
    completionCmd.command("install")
        .description("Installs bash completion script in .bashrc")
        .action(async () => {
            await exec("bash -c 'si completion bash >>$HOME/.bashrc'");
            console.log("Scramjet CLI completion installed in .bashrc. Please run source ~/.bashrc for immediate effect."); //eslint-disable-line
        });
};
