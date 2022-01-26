import { SequenceConfig } from "./runner-config";
import { Readable } from "stream";
import { InstanceId } from "./instance";
import { IObjectLogger } from "./object-logger";
export type SequenceInfo = {
    id: string;
    config: SequenceConfig;
    instances: Set<InstanceId>;
}

export interface ISequenceAdapter {
    /**
     * Adapter name.
     */
    name: string;

    init(): Promise<void>;

    /**
     * Identifies existing sequences
     */
    list(): Promise<SequenceConfig[]>;

    /**
     * Identifies new sequence
     */
    identify(stream: Readable, id: string): Promise<SequenceConfig>;

    remove(conifg: SequenceConfig): Promise<void>

    logger: IObjectLogger;
}
