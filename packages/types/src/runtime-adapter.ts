import { IInstanceAdapter } from "./instance-adapter";
import { ISequenceAdapter } from "./sequence-adapter";

export interface IRuntimeAdapter {
    name: string;

    init(): Promise<{ error?: string }>;

    config: { [key: string]: any };

    instanceAdapter: IInstanceAdapter;
    sequenceAdapter: ISequenceAdapter;
}
