import { CommandDefinition } from "../../types";

/**
 * Initializes `store` command.
 *
 * @param {Command} program Commander object.
 */
export const store: CommandDefinition = (program) => {
    // TODO: uncomment after done
    // const isProdEnv = isProductionEnv(profileConfig.getEnv());

    // if (!isProdEnv) return;

    const storeCmd = program
        .command("store")
        .addHelpCommand(false)
        .usage("[command] [options...]")
        .description("Operations on a Store");

    storeCmd
        .command("list")
        .alias("ls")
        .description("Lists all available Sequences in Store")
        .action(async () => { });

    storeCmd
        .command("send")
        .argument("<package>", "The file or directory to upload. If directory, it will be packed and send.")
        .option("--name <name>", "Allows to name sequence")
        .description("Send the Sequence package to the Store");
    // .action(async (sequencePackage: string, { name }) => { });

    storeCmd
        .command("delete")
        .alias("rm")
        .argument("<id>", "The Sequence id to remove or '-' for the last uploaded")
        .description("Delete the Sequence from the Hub");
    // .action(async (id: string) => { });
};
