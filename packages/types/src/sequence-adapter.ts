import { SequenceConfig } from "./runner-config";
import { Readable } from "stream";
import { IObjectLogger } from "./object-logger";

export type SequenceInfo = {
    config: SequenceConfig;
    id: string;
    instances: string[];
    location : string;
    name? : string;
}

export interface ISequenceAdapter {
    /**
     * Adapter name.
     */
    name: string;

    init(): Promise<void>;

    /**
     * Identifies existing Sequences
     */
    list(): Promise<SequenceConfig[]>;

    /**
     * Identifies new Sequence
     */
    identify(stream: Readable, id: string, override?: boolean): Promise<SequenceConfig>;

    remove(conifg: SequenceConfig): Promise<void>

    logger: IObjectLogger;
}
