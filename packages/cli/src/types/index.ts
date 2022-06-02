import { Command } from "commander-completion";

/**
 * CommandDefinition is an object from commander.js
 * program.opts() - show options
 * program.args - show arguments passed by user
 */
export type CommandDefinition = (program: Command) => void;

export type configEnv = "development" | "production";
export const isConfigEnv = (env: string) => ["development", "production"].includes(env);
export const isDevelopmentEnv = (env: configEnv): boolean => { return env === "development"; };
export const isProductionEnv = (env: configEnv): boolean => { return env === "production"; };

export type displayFormat = "pretty" | "json";
export const isConfigFormat = (format: string) => ["pretty", "json"].includes(format);
export const isJsonFormat = (format: displayFormat):boolean => { return format === "json"; };
export const isPrettyFormat = (format: displayFormat):boolean => { return format === "pretty"; };

export interface SiConfigEntity {
    profile: string;
}

export interface ProfileConfigEntity {
    configVersion: number;
    apiUrl: string;
    debug: boolean;
    format: displayFormat;
    middlewareApiUrl: string;
    env: configEnv;
    scope: string;
    token: string,
}

export interface SessionConfigEntity {
    lastPackagePath: string;
    lastInstanceId: string;
    lastSequenceId: string;
    lastSpaceId: string,
    lastHubId: string,
}
