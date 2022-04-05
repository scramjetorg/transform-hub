#!/usr/bin/env ts-node
/* eslint-disable no-console */

import findPackage from "find-package-json";
import commander from "commander";
import completionMixin, { Command } from "commander-completion";
import { ClientError, ClientUtils } from "@scramjet/client-utils";

import { commands } from "../lib/commands/index";
import { setPlatformDefaults } from "../lib/platform";
import { globalConfig } from "../lib/config";
import { initPaths } from "../lib/paths";
import chalk from "chalk";

const version = findPackage(__dirname).next().value?.version || "unknown";
const CommandClass = completionMixin(commander).Command;

const getExitCode = (_err: ClientError) => 1;
const program = new CommandClass() as Command;
const errorHandler = async (err: ClientError) => {
    process.exitCode = getExitCode(err);
    const { format, debug } = globalConfig.getConfig();

    if (globalConfig.isJsonFormat(format)) {
        // TODO Check if it is a CLI or an API Client Error.
        console.log(
            JSON.stringify({
                error: true,
                code: err?.code,
                stack: debug ? err?.stack : undefined,
                message: err?.message,
                reason: err?.reason?.message,
                apiStatusCode: err?.status,
                apiError: await err?.toJSON().then((body) => body).catch(() => undefined),
            })
        );
    } else if (err) {
        console.error(err.stack);

        if (err.reason) {
            console.error("Caused by:");
            console.error(err.reason.stack);
        }
    }
    process.exit();
};

/**
 * Start commander using defined config {@link Apple.seeds}
 */
(async () => {
    initPaths();
    const { token, env, middlewareApiUrl } = globalConfig.getConfig();

    /**
     * Set the default values for platform only when all required settings
     * are provided in the global-config.json file.
     * Do not set the default platform values when displaying the help commands.
     */
    if (token && globalConfig.isProductionEnv(env) && middlewareApiUrl &&
        !process.argv.includes((program as any)._helpShortFlag) &&
        !process.argv.includes((program as any)._helpLongFlag)) {
        ClientUtils.setDefaultHeaders({
            Authorization: `Bearer ${token}`
        });

        await setPlatformDefaults();
    }

    for (const command of Object.values(commands)) command(program);

    program
        .description(
            "This is a Scramjet Command Line Interface to communicate with Transform Hub and Cloud Platform.")
        .version(`CLI version: ${version}`, "-v, --version", "Display current CLI version")
        .addHelpCommand(false)
        .addHelpText(
            "afterAll",
            chalk.greenBright("\nTo find out more about CLI, please check out our docs at https://hub.scramjet.org/docs/cli\n"))
        .addHelpText(
            "afterAll",
            `${chalk.hex("#7ed2e4")("Read more about Scramjet at https://scramjet.org/ 🚀\n")}`)
        .parse(process.argv);

    await new Promise((res) => program.hook("postAction", res));
})().catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
