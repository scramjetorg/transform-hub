#!/usr/bin/env ts-node

import { printHelpAndExitIfRequested } from "@scramjet/config";
import { startManager } from "../lib/start-manager";

printHelpAndExitIfRequested(process.argv, {
    name: "manager",
    usage: "[options...]",
    description: "Start Scramjet Manager."
});

startManager()
    .catch(e => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });
