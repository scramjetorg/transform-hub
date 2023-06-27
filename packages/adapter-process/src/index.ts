/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes and name field.
 */

export { ProcessSequenceAdapter as SequenceAdapter }  from "./process-sequence-adapter";
export { ProcessInstanceAdapter as InstanceAdapter } from "./process-instance-adapter";

export const name = "process";
