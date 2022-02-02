import { StartSequenceDTO } from "@scramjet/types";

export function isStartSequenceDTO(arg: any): arg is StartSequenceDTO {
    if (typeof arg !== "object") return false;
    if (typeof arg.id !== "string") return false;
    if ("appConfig" in arg && typeof arg.appConfig !== "object") return false;
    if ("args" in arg) {
        if (!Array.isArray(arg.args)) return false;
        if ((arg.args as string[]).some(x => typeof x !== "string")) return false;
    }

    return true;
}
