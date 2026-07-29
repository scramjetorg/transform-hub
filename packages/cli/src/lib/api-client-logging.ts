import { OptionDescriptor } from "@scramjet/config";

/** Global standalone-CLI switch for the existing debug API-client logger. */
export const apiClientLoggingOption: OptionDescriptor = {
    name: "logApiClients",
    flag: "log-api-clients",
    type: "boolean",
    negatable: true,
    description: "Enable API-client lifecycle logs"
};

/** Standalone CLI override for the existing debug API-client lifecycle logger. */
let apiClientLoggingOverride: boolean | undefined;

export function setApiClientLoggingOverride(value: boolean | undefined): void {
    apiClientLoggingOverride = value;
}

export function shouldAttachApiClientLogger(debug: boolean, configured: boolean | undefined = true): boolean {
    return debug && (apiClientLoggingOverride ?? configured !== false);
}
