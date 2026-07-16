"use strict";

/**
 * Demo fixture for observing sequence logs and stdio through STH.
 *
 * Start STH with `DEVELOPMENT=true` and the process adapter to have the host
 * mirror sequence stdout/stderr to the main process streams.
 *
 * @this {import("@scramjet/sequence-types").SequenceAppContext}
 */
module.exports = async function loggingSequence(input, label = "logging-sequence") {
    this.logger.info("sequence logger info", { label });
    this.logger.warn("sequence logger warn", { label });

    console.log(`[${label}] console.log to stdout`);
    console.error(`[${label}] console.error to stderr`);

    process.stdout.write(`[${label}] process.stdout.write\n`);
    process.stderr.write(`[${label}] process.stderr.write\n`);


    this.logger.info("sequence logger finishing", { label });

    return;
};
