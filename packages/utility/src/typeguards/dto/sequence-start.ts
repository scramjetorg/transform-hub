import { StartSequenceDTO, StartSequenceEndpointPayloadDTO } from "@scramjet/types";

// eslint-disable-next-line complexity
export function isStartSequenceDTO(arg: any): arg is StartSequenceDTO {
    if (typeof arg !== "object") throw new Error("DTO is not an object");
    const { id, appConfig, args, instanceId, ...rest } = arg;

    if (typeof id !== "string") throw new Error("DTO id is not string");
    if (!["object", "undefined"].includes(typeof appConfig))
        throw new Error(`DTO appConfig is ${typeof appConfig}, not an object`);
    if (instanceId && typeof instanceId !== "string") {
        throw new Error("DTO instanceId is not valid string");
    }
    if (typeof args !== "undefined") {
        if (!Array.isArray(args)) throw new Error("DTO args are not an array");
        if ((args as string[]).some((x) => typeof x !== "string")) throw new Error("DTO args are all strings");
    }
    if (instanceId !== undefined && typeof instanceId === "string" && instanceId.length !== 36)
        throw new Error("DTO instanceId is not 36 long");
    if (Object.keys(rest).length > 0) throw new Error(`DTO has unknown ${Object.keys(rest)} keys`);

    return true;
}

export function isStartSequenceEndpointPayloadDTO(arg: any): arg is StartSequenceEndpointPayloadDTO {
    if (typeof arg !== "object") {
        throw new Error("DTO is not an object");
    }
    const { appConfig, instanceId } = arg;

    if (!["object", "undefined"].includes(typeof appConfig))
        throw new Error(`DTO appConfig is ${typeof appConfig}, not an object`);
    if (instanceId !== undefined && typeof instanceId === "string" && instanceId.length !== 36)
        throw new Error("DTO instanceId is not 36 long");
    if (instanceId && typeof instanceId !== "string") {
        throw new Error("DTO instanceId is not valid string");
    }
    return true;
}
