import { readFileSync } from "fs";
import { CommandDefinition } from "../../types";

const bashCompletion = require.resolve("../../completion/si");

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
            // @ts-ignore
            program.complete({
                line: process.env.COMP_LINE,
                cursor: process.env.COMP_POINT
            });
        });

    /**
    * Command: `si completion bash`
    * Prints the 
    * {@link defaultConfig}
    */
    completionCmd.command("bash")
        .description("Print out bash completion script")
        .action(() => console.log(readFileSync(bashCompletion, {encoding:"utf8", flag:"r"}))); //eslint-disable-line
};
