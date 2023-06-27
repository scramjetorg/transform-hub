import { ILifeCycleAdapterMain, ILifeCycleAdapterRun, IComponent, ISequenceAdapter } from "./index"

export interface IRuntimeAdapter extends ILifeCycleAdapterMain, ILifeCycleAdapterRun, IComponent {
    SequenceAdapter: ISequenceAdapter;
    InstanceAdapter: ILifeCycleAdapterMain & ILifeCycleAdapterRun & IComponent;
    name: string;
}
