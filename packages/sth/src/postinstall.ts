#!/usr/bin/env ts-node

import { defaultConfig } from "@scramjet/sth-config";

if (defaultConfig.telemetry.status) {
    // eslint-disable-next-line no-console
    console.log(`Scramjet Transform Hub: Telemetry is ${defaultConfig.telemetry.status}. If you do not want to send anonymous usage data edit the configuration file or use "--no-telemetry" flag when starting STH`);
}
