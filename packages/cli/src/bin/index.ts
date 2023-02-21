#!/usr/bin/env ts-node
/* eslint-disable no-console */

import commander from "commander";
import completionMixin, { ComplitingCommand } from "commander-completion";
import { ClientUtils } from "@scramjet/client-utils";

import { errorHandler } from "../lib/errorHandler";
import { commands } from "../lib/commands/index";
import { setPlatformDefaults } from "../lib/platform";
import { initConfig, profileManager } from "../lib/config";
import { initPaths } from "../lib/paths";
import { configEnv, isProductionEnv } from "../types";
import * as dns from "dns";

const CommandClass = completionMixin(commander).Command;
const profileConfig = profileManager.getProfileConfig();
const program = new CommandClass() as ComplitingCommand;

const platformRequirementsValid = (token: string, env: configEnv, middlewareApiUrl: string) =>
    token &&
    isProductionEnv(env) &&
    middlewareApiUrl &&
    !process.argv.includes((program as any)._helpShortFlag) &&
    !process.argv.includes((program as any)._helpLongFlag);

const initPlatform = async () => {
    const { token, env, middlewareApiUrl } = profileConfig.get();

    /**
     * Set the default values for platform only when all required settings
     * are provided in the profile configuration.
     * Do not set the default platform values when displaying the help commands.
     */
    if (platformRequirementsValid(token, env, middlewareApiUrl)) {
        ClientUtils.setDefaultHeaders({ Authorization: `Bearer ${token}`, });

        await setPlatformDefaults();
    }
};

/**
 * Start commander using defined config {@link Apple.seeds}
 */
(async () => {
    // https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
    const { setDefaultResultOrder } = dns as unknown as { setDefaultResultOrder?: (param: string) => void };

    if (setDefaultResultOrder) { setDefaultResultOrder("ipv4first"); }

    initPaths();
    initConfig();
    await initPlatform();

    commands.forEach((command) => command(program));

    program.parse(process.argv);

    await new Promise((res) => program.hook("postAction", res));
})().catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
