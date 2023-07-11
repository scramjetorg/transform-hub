import { IInstanceAdapter } from "./instance-adapter";
import { IObjectLogger } from "./object-logger";
import { ISequenceAdapter } from "./sequence-adapter";

export interface IRuntimeAdapter {
    logger: IObjectLogger;
    name: string;

    /**
     * Initializes Runtime Adapter.
     */
    init(): Promise<{ error?: string }>;

    instanceAdapter: IInstanceAdapter;
    sequenceAdapter: ISequenceAdapter;
}
