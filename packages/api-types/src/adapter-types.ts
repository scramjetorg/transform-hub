/**
 * Runtime adapter augmentation types.
 *
 * Simplified structural copies from @scramjet/types/runtime-adapter.ts.
 */

import { STHConfiguration } from "./config-types";

export type RuntimeOptionType = "string" | "number" | "boolean" | "string[]" | "number[]" | "json";

export interface RuntimeOptionDescriptor {
    name: string;
    flag?: string;
    description?: string;
    type?: RuntimeOptionType;
    short?: string;
    flagAliases?: readonly string[];
    choices?: readonly string[];
    parse?: (value: string) => unknown;
    defaultValue?: unknown;
    multiple?: boolean;
    negatable?: boolean;
}

export interface RuntimeOptionRegistry {
    option(descriptor: RuntimeOptionDescriptor): this;
    getOptions(): RuntimeOptionDescriptor[];
}

export interface IAdapterAugmentation {
    initialize: (config: any) => boolean | void | Promise<boolean | void>;
    augmentOptions: (options: RuntimeOptionRegistry) => RuntimeOptionRegistry;
    augmentConfig: (config: STHConfiguration) => STHConfiguration;
    SequenceAdapterClass: new (config: STHConfiguration) => any;
    LifeCycleAdapterClass: new (config: STHConfiguration, id: string) => any;
}
