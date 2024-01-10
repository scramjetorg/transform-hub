#!/usr/bin/env ts-node
/* eslint-disable no-console */

import { Command } from "commander";

import { errorHandler } from "../lib/errorHandler";
import { commands } from "../lib/commands/index";
import { initConfig } from "../lib/config";
import { initPaths } from "../lib/paths";
import * as dns from "dns";

const program = new Command();

/**
 * Start commander using defined config {@link Apple.seeds}
 */
(async () => {
    // https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
    const { setDefaultResultOrder } = dns as unknown as { setDefaultResultOrder?: (param: string) => void };

    if (setDefaultResultOrder) { setDefaultResultOrder("ipv4first"); }

    initPaths();
    initConfig();

    commands.forEach((command) => command(program));

    program.parse(process.argv);

    await new Promise((res) => program.hook("postAction", res));
})().catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
