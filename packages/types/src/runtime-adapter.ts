import { IComponent } from "./component";
import { IInstanceAdapter } from "./instance-adapter";
import { ILifeCycleAdapterMain, ILifeCycleAdapterRun } from "./lifecycle-adapters";
import { ISequenceAdapter } from "./sequence-adapter";
import { STHConfiguration } from "./sth-configuration";

export interface IRuntimeAdapter {
    SequenceAdapter: ISequenceAdapter & { new (config: STHConfiguration): ISequenceAdapter };
    InstanceAdapter: ILifeCycleAdapterMain & ILifeCycleAdapterRun & IComponent & { new (config: STHConfiguration): IInstanceAdapter };
    name: string;
    pkgName: string;
    init(): Promise<{ error?: string }>;
    status: "ready" | { error?: string};
}
