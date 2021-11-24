import { ILifeCycleAdapterMain } from ".";
import { SequenceConfig } from "./runner-config";
import { Readable } from "stream";

export interface ISequenceInfo {
    getId(): string;
    getConfig(): SequenceConfig;
    addInstance(id: string): void;
    removeInstance(id: string): void;
    hasInstances(): boolean;
    instances: readonly string[];
}


export interface ISequenceAdapter extends ILifeCycleAdapterMain {
    info: ISequenceInfo;

    /**
     * Identifies existing sequences
     *
     * @returns {Promise<ISequenceAdapter[]>} found packages
     */
    list(): Promise<ISequenceAdapter[]>;
    /**
     * Passes stream to PreRunner and resolves with PreRunner's results.
     *
     * @param {Readable} stream Stream with package.
     * @returns {Promise<void>}
     */
    identify(stream: Readable, id: string): Promise<void>;
}