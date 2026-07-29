import type { CommandDescriptor, CommandContext } from "@scramjet/config";
import type { OutboundVerser2IngressLevel as SharedVerser2IngressLevel, OutboundVerser2ProfileConfig as SharedVerser2ProfileConfig, OutboundVerser2ProfileDraft as SharedVerser2ProfileDraft } from "@scramjet/config";

/**
 * CommandDefinition takes a program root CommandDescriptor and mutates it
 * to register subcommands, options, arguments, and actions.
 */
export type CommandDefinition = (program: CommandDescriptor) => void;

export type configEnv = "development" | "production";
export const isConfigEnv = (env: string) => ["development", "production"].includes(env);
export const isDevelopmentEnv = (env: configEnv): boolean => { return env === "development"; };
export const isProductionEnv = (env: configEnv): boolean => { return env === "production"; };

export type displayFormat = "pretty" | "json";
export const isConfigFormat = (format: string) => ["pretty", "json"].includes(format);
export const isJsonFormat = (format: displayFormat): boolean => { return format === "json"; };
export const isPrettyFormat = (format: displayFormat): boolean => { return format === "pretty"; };

export interface SiConfigEntity {
    profile: string;
}

export interface ProfileConfigEntity {
    configVersion: number;
    apiUrl: string;
    middlewareApiUrl: string;
    env: configEnv;
    scope: string;
    token: string,
    log: {
        debug: boolean;
        format: displayFormat;
    }
    verser2?: Verser2ProfileConfig;
    verser2Draft?: Verser2ProfileDraft;
}

export type Verser2IngressLevel = SharedVerser2IngressLevel;
export type Verser2ProfileConfig = SharedVerser2ProfileConfig;
export type Verser2ProfileDraft = SharedVerser2ProfileDraft;

export interface SessionConfigEntity {
    lastPackagePath: string;
    lastInstanceId: string;
    lastSequenceId: string;
    lastSpaceId: string,
    lastHubId: string,
    sessionId: string
}

/**
 * ExtendedHelpConfiguration is used to pass context options throughout commands.
 * In the native descriptor model this is carried through CommandDescriptor metadata.
 */
export type ExtendedHelpConfiguration = Record<string, unknown> & { developersOnly?: boolean };

// Re-export CommandContext for use in command modules
export type { CommandDescriptor, CommandContext };
