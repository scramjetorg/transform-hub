/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */

export { ProcessSequenceAdapter as SequenceAdapter }  from "./process-sequence-adapter";
export { ProcessInstanceAdapter as InstanceAdapter } from "./process-instance-adapter";

export const init = (...args: any[]) => {
    return true;
}

export const name = "process";
