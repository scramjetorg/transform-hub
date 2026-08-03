#!/usr/bin/env ts-node

import { CommandUsageError } from "@scramjet/config";
import { runManagerCsrEnrollmentCli } from "../lib/csr-enrollment-cli";

runManagerCsrEnrollmentCli().catch((error) => {
    process.stderr.write(error instanceof CommandUsageError ? `Usage error: ${error.message}\n` : "Manager CSR enrollment command failed\n");
    process.exitCode = 1;
});
