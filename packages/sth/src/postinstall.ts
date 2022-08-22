#!/usr/bin/env ts-node

import { defaultConfig } from "@scramjet/sth-config";

if (defaultConfig.telemetry.status === "on") {
    // eslint-disable-next-line no-console
    console.log(`Scramjet Transform Hub: Telemetry is ${defaultConfig.telemetry.status}. If you do not want to send anonymous usage data edit the configuration file or use "--telemetry off" flag when starting STH`);
}
