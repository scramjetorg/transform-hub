import { RunnerConfig } from "./runner-config";

/**
 *
 * Sequence type describes the collection
 * of uncompressed developer's code files
 * and the configuration file attached to them
 * residing on certain volume.
 *
 * The configuration file is required to run
 * Sequence Instance.
 *
 * Question: this should probably moved to @scramjet/model, right?
 *
 */
export type Sequence = {
    id: string,
    config: RunnerConfig,
    instances: string[]
}

export interface ISequenceStore {
    getSequences(): Sequence[];
    getById(id: string): Sequence | undefined;
    add(sequence: Sequence): void;
    delete(id: string): void;
}
