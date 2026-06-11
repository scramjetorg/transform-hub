#!/usr/bin/env ts-node

import { startManager } from "../lib/start-manager";

startManager()
    .catch(e => {
        // eslint-disable-next-line no-console
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });
