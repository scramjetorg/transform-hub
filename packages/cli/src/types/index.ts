import { Command } from "commander-completion";

/**
 * CommandDefinition is an object from commander.js
 * program.opts() - show options
 * program.args - show arguments passed by user
 */
export type CommandDefinition = (program: Command) => void;

export type configEnv = "development" | "production";

export interface GlobalConfigEntity {
    configVersion: number;
    apiUrl: string;
    log: boolean;
    format: string;
    middlewareApiUrl: string;
    env: configEnv;
    scope: string;
    token: string,
}

export interface SessionConfigEntity {
    apiUrl: string;
    lastPackagePath: string;
    lastInstanceId: string;
    lastSequenceId: string;
    lastSpaceId: string,
    lastHubId: string,
    scope: string;
}
