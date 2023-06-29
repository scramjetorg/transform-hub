import { ILifeCycleAdapterMain, ILifeCycleAdapterRun } from "./lifecycle-adapters";
import { IComponent } from "./component";

export interface IInstanceAdapter extends ILifeCycleAdapterMain, ILifeCycleAdapterRun, IComponent {}
