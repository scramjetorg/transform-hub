export { ProcessSequenceAdapter as SequenceAdapter } from "./process-sequence-adapter";
export { ProcessInstanceAdapter as InstanceAdapter } from "./process-instance-adapter";

export function initialize() {
    return true;
}

type Command = import("commander").Command;
export function augmentOptions(options: Command): Command {
    return options;
}
