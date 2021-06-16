import { CommandDefinition } from "../../types";

export const pack: CommandDefinition = (program) => {
    program.command("pack")
        .option("-d, --dry-run", "Do not execute operations")
    ;
};
