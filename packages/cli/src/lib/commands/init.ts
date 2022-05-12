import { CommandDefinition } from "../../types";

export const init: CommandDefinition = (program) => {
    const initCmd = program
        .command("init")
        .addHelpCommand(false)
        .alias("i")
        .usage("[command] [options...]");

    initCmd
        .command("template")
        .alias("tmpl")
        .argument("<projectName>")
        .option("--lang <ts|js|py>", "Choose the language to develop the Sequence")
        .description("Create all the necessary files and start working on your Sequence")
        .action((/* projectName, { lang } */) => {
            // FIXME: implement me
            throw new Error("Implement me");
        });
};
