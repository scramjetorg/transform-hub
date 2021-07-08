import { CommandDefinition } from "../../types";
import { packAction } from "../common";

export const pack: CommandDefinition = (program) => {
    const packProgram = program
        .command("pack <directory>")
        .option("-c, --stdout", "output to stdout (ignores -o)")
        .option("-o, --output <file.tar.gz>", "output path - defaults to dirname");

    packProgram.action(packAction);
};
