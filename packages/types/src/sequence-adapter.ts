import { Readable } from "stream";
import { IObjectLogger } from "./object-logger";
import { SequenceConfig } from "./runner-config";

export type SequenceInfo = {
    config: SequenceConfig;
    id: string;
    instances: string[];
    location : string;
    name? : string;
}

export type SequenceInfoInstance = Omit<SequenceInfo, "instances">;

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
