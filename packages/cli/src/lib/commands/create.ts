import { CommandDefinition } from "../../types";
import { createAction } from "../common";
/**
 * Initializes `create` command.
 *
 * @param {Command} program Commander object.
 */
export const create: CommandDefinition = (program) => {
    const createProgram = program
        .command("create <hhh>")
        .option("--lang, <js|ts>", "Sequence language", "ts")
        .option("--log-level, <debug|trace>", "Specify log level", "trace")
        .option("--overwrite", "Overwrite existing sequence", false);

    createProgram.action(createAction);
};
