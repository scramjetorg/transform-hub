import { SequenceInfo } from "@scramjet/types";

export interface ISequenceStore {
    get sequences(): SequenceInfo[];
    getById(id: string): SequenceInfo | undefined;
    getByName(sequenceName: string): SequenceInfo | undefined;
    getByNameOrId(sequenceNameOrId: string): SequenceInfo | undefined;
    set(sequence: SequenceInfo): void;
    delete(sequenceId: string): boolean;
    clear(): void;
}
