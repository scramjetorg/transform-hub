#!/usr/bin/env ts-node

import { cmd, resolveCommandPath, parseCommandContext, executeCommand, generateHelp, isHelpRequested, type CommandDescriptor } from "@scramjet/config";
import chalk from "chalk";
import * as dns from "dns";

import { errorHandler } from "../lib/errorHandler";
import { commandDescriptors } from "../lib/commands/index";
import { initConfig, profileManager } from "../lib/config";
import { parseConfigSelection } from "../lib/config/args";
import { initPaths } from "../lib/paths";
import findPackage from "find-package-json";

const version = findPackage(__dirname).next().value?.version || "unknown";

function normalizeCommandArgs(args: string[]): string[] {
    const selection = parseConfigSelection(args);

    if (!selection) return args;

    const configArgs = selection.kind === "readonly-path" ? ["--config-path", selection.value] : ["-c", selection.value];
    const withoutConfig = [...args];

    if (args.some((arg) => arg === "-c" || arg === "--config" || arg === "--config-path")) {
        const flagIndex = withoutConfig.findIndex((arg) => arg === "-c" || arg === "--config" || arg === "--config-path");
        withoutConfig.splice(flagIndex, 2);
    } else {
        const inlineIndex = withoutConfig.findIndex((arg) => arg.startsWith("-c=") || arg.startsWith("--config=") || arg.startsWith("--config-path="));
        withoutConfig.splice(inlineIndex, 1);
    }

    return [...withoutConfig, ...configArgs];
}

/**
 * Build the full command tree from descriptors and run it.
 */
(async () => {
    // https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
    const { setDefaultResultOrder } = dns as unknown as { setDefaultResultOrder?: (param: string) => void };

    if (setDefaultResultOrder) {
        setDefaultResultOrder("ipv4first");
    }

    initPaths();
    initConfig();

    // Build root command descriptor
    const rootDescriptor: CommandDescriptor = cmd("si", (b) => {
        b.desc("This is a Scramjet Command Line Interface to communicate with Transform Hub and Cloud Platform.")
            .usage("[command] [options...]")
            .option("-c, --config <path>", "Use configuration from file")
            .option("--config-path <path>", "Use configuration from file")
            .option("--progress", "Global flag, used to display progress (currently used only in 'si seq send/deploy' command");

        // Register child commands from command modules
        commandDescriptors.forEach((child: CommandDescriptor) => b.addCommand(child));
    });

    // Handle --version before command resolution
    if (process.argv.includes("--version") || process.argv.includes("-v")) {
        console.log(`SI version: ${version}`);
        process.exit(0);
    }

    const commandArgv = normalizeCommandArgs(process.argv.slice(2));
    const resolve = resolveCommandPath(commandArgv, rootDescriptor);
    const leaf = resolve.command;

    // Show help text
    if (isHelpRequested(process.argv)) {
        const helpLines: string[] = [];

        helpLines.push(`Current profile: ${profileManager.getProfileName()}`);
        helpLines.push("");

        const help = generateHelp(leaf);

        helpLines.push(help);
        helpLines.push(chalk.greenBright("To find out more about CLI, please check out our docs at https://docs.scramjet.org/platform/cli-reference"));
        helpLines.push(`${chalk.hex("#7ed2e4")("Read more about Scramjet at https://scramjet.org/ 🚀")}`);
        console.log(helpLines.join("\n"));
        process.exit(0);
    }

    // Execute commands
    if (leaf.action) {
        const ctx = parseCommandContext(resolve, rootDescriptor.options);

        await executeCommand(ctx);
    } else if (leaf.children && leaf.children.length > 0) {
        // No action and has children - show help for the node
        console.log(generateHelp(leaf));
    }

    // Wait for any pending promises (postAction)
    await new Promise((res) => setImmediate(res));
})().catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
