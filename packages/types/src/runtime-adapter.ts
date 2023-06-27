import { ILifeCycleAdapterMain, ILifeCycleAdapterRun, IComponent, ISequenceAdapter, STHConfiguration, IInstanceAdapter } from "./index"

export interface IRuntimeAdapter {
    SequenceAdapter: ISequenceAdapter & { new (config: STHConfiguration): ISequenceAdapter };
    InstanceAdapter: ILifeCycleAdapterMain & ILifeCycleAdapterRun & IComponent & { new (config: STHConfiguration): IInstanceAdapter };
    name: string;
    init(): { error?: string };
}
