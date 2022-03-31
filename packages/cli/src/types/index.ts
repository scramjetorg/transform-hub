import { Command } from "commander-completion";

/**
 * CommandDefinition is an object from commander.js
 * program.opts() - show options
 * program.args - show arguments passed by user
 */
export type CommandDefinition = (program: Command) => void;

export type configEnv = "development" | "production";
export const isConfigEnv = (env: string) => ["development", "production"].includes(env);
export type configFormat = "pretty" | "json";
export const isConfigFormat = (format: string) => ["pretty", "json"].includes(format);

export interface GlobalConfigEntity {
    configVersion: number;
    apiUrl: string;
    debug: boolean;
    format: configFormat;
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
