import { AdapterConfig, STHConfiguration } from "./sth-configuration";
import { MaybePromise } from "./utils";
import { ILifeCycleAdapterRun } from "./lifecycle-adapters";
import { ISequenceAdapter } from "./sequence-adapter";

type Command = import("commander").Command;

export type AdapterInitializeFunction = (config: AdapterConfig) => MaybePromise<boolean | void>;
export type AdapterAugmentOptionsFunction = (options: Command) => Command;
export type AdapterAugmentConfigFunction = (config: STHConfiguration) => STHConfiguration;

export interface IAdapterAugmentation {
    initialize: AdapterInitializeFunction;
    augmentOptions: AdapterAugmentOptionsFunction;
    augmentConfig: AdapterAugmentConfigFunction;
    SequenceAdapterClass: new (config: STHConfiguration) => ISequenceAdapter;
    LifeCycleAdapterClass: new (config: STHConfiguration, id: string) => ILifeCycleAdapterRun;
}
