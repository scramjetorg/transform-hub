
import { ISequenceAdapter } from "./sequence-adapter";

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

export interface ISequenceStore {
    getSequences(): ISequenceAdapter[];
    getById(id: string): ISequenceAdapter | null;
    add(sequence: ISequenceAdapter): void;
    delete(id: string): void;
}
