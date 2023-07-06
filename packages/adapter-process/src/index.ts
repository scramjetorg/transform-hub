/**
 * Adapter module must provide SequenceAdapter, InstanceAdapter classes, init method and name field.
 */
export { ProcessSequenceAdapter as SequenceAdapter } from "./process-sequence-adapter";
export { ProcessInstanceAdapter as InstanceAdapter } from "./process-instance-adapter";

export const init = async (config: any) => {
    if (!config.sequencesRoot) {
        return Promise.reject({ error: "No 'sequencesRoot' in config" });
    }

    return Promise.resolve({});
};

export const name = "process";
