import { AdapterConfig, STHConfiguration } from "./sth-configuration";
import { MaybePromise } from "./utils";
import { ILifeCycleAdapterRun } from "./lifecycle-adapters";
import { ISequenceAdapter } from "./sequence-adapter";

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

export type AdapterInitializeFunction = (config: AdapterConfig) => MaybePromise<boolean | void>;
export type AdapterAugmentOptionsFunction = (options: RuntimeOptionRegistry) => RuntimeOptionRegistry;
export type AdapterAugmentConfigFunction = (config: STHConfiguration) => STHConfiguration;

export interface IAdapterAugmentation {
    initialize: AdapterInitializeFunction;
    augmentOptions: AdapterAugmentOptionsFunction;
    augmentConfig: AdapterAugmentConfigFunction;
    SequenceAdapterClass: new (config: STHConfiguration) => ISequenceAdapter;
    LifeCycleAdapterClass: new (config: STHConfiguration, id: string) => ILifeCycleAdapterRun;
}
