import { Command } from "commander-completion";

/**
 * CommandDefinition is an object from commander.js
 * program.opts() - show options
 * program.args - show arguments passed by user
 */
export type CommandDefinition = (program: Command) => void;

export type Config = {
    configVersion: number;
    apiUrl: string;
    log: boolean;
    format: string;
    lastPackagePath: string;
    lastInstanceId: string;
    lastSequenceId: string;
    middlewareApiUrl: string,
    lastSpaceId: string,
    lastHubId: string,
    env: "development" | "production",
};
