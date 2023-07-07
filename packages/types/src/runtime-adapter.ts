import { IInstanceAdapterContructor } from "./instance-adapter";
import { ISequenceAdapterContructor } from "./sequence-adapter";

export interface IRuntimeAdapter {
    SequenceAdapter: ISequenceAdapterContructor;
    InstanceAdapter: IInstanceAdapterContructor;
    name: string;
    pkgName: string;
    init(config: any): Promise<{ error?: string }>;
    config: { [key: string]: any };
    status: "ready" | { error?: string };
}
