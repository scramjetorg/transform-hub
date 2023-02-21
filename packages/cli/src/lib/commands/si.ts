import { CommandDefinition } from "../../types";
import findPackage from "find-package-json";
import chalk from "chalk";
import { profileManager } from "../config";
import { Command } from "commander";

const version = findPackage(__dirname).next().value?.version || "unknown";

/**
 * Initializes `si` command.
 *
 * @param {Command} program Commander object.
 */
export const si: CommandDefinition = (program: Command) => {
    program
        .description("This is a Scramjet Command Line Interface to communicate with Transform Hub and Cloud Platform.")
        .name("si")
        .version(`SI version: ${version}`, "-v, --version", "Display current SI version")
        .option("--config <profile-name>", "Use configuration from profile")
        .option("--config-path <path>", "Use configuration from file")
        .option("--progress", "Global flag, used to display progress (currently used only in 'si seq send/deploy' command")
        .helpOption("-h, --help", "Display help for command")
        .showHelpAfterError("(Use 'si --help' or 'si [command] --help' for additional information)")
        .addHelpCommand(false)
        .addHelpText("beforeAll", `Current profile: ${profileManager.getProfileName()}`)
        .addHelpText("afterAll", `\n${chalk.greenBright("To find out more about CLI, please check out our docs at https://docs.scramjet.org/platform/cli-reference")}\n`)
        .addHelpText("afterAll", `${chalk.hex("#7ed2e4")("Read more about Scramjet at https://scramjet.org/ 🚀\n")}`);
};
