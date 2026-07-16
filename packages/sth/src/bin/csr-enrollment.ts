#!/usr/bin/env ts-node

import { CommandUsageError } from "@scramjet/config";
import { runCsrEnrollmentCli } from "../lib/csr-enrollment-cli";

runCsrEnrollmentCli().catch((error) => {
    process.stderr.write(error instanceof CommandUsageError ? `Usage error: ${error.message}\n` : "CSR enrollment command failed\n");
    process.exitCode = 1;
});
