import { CommandDefinition } from "../../types";

export const template: CommandDefinition = (program) => {
    // TODO: implement me
    const templateCmd = program
        .command("template")
        .alias("tmpl")
        .usage("si tmpl [subcommand] [options...]")
        // FIXME: in draft:  --lang=ts|js|py <folder> -folder stands for what?
        // FIXME: shouldnt we print (default: js) or other?
        .option("--lang <ts|js|py>", "choose the language to develop the sequence")
        .description("create template and start working on your sequence")
        // FIXME: which description should we leave?
        // .description("Template command creates for you necessary files for sequence development.")

    // FIXME: mentioned in index draft but not template draft, init- should I stay or should I gone.....
    templateCmd
        .command("init")
        .argument("<>")
        .action(() => {
            // TODO: implement me
            throw new Error("Implement me");
        });
    // .description("Template command creates for you necessary files for sequence development.");
};
