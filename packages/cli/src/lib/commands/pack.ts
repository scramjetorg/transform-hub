import { CommandDefinition } from "../../types";
import { packAction } from "../common";

/**
 * Initializes `pack` command.
 *
 * @param {Command} program Commander object.
 */
export const pack: CommandDefinition = (program) => {
    // TODO: move to si seq pack
    const packProgram = program
        .command("pack <directory>")
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname");

    packProgram.action(packAction);
};
