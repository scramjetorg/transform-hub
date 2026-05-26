import { StartSequenceDTO, StartSequenceEndpointPayloadDTO } from "@scramjet/types";
import { LogLevelStrings } from "../../constants";

// eslint-disable-next-line complexity
export function isStartSequenceDTO(arg: any): arg is StartSequenceDTO {
    if (typeof arg !== "object") throw new Error("DTO is not an object");
    const { id, name, sequenceName, instanceName, required, restartLimit, appConfig, args, instanceId, logLevel, keepAlive, exposePath, ...rest } = arg;

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
    if (logLevel && !LogLevelStrings.includes(logLevel)) {
        throw new Error("DTO logLevel is not valid");
    }
    if (typeof keepAlive !== "undefined" && typeof keepAlive !== "boolean")
        throw new Error("DTO keepAlive is not boolean");

    // Validate and normalize sequenceName if present
    if (typeof sequenceName !== "undefined") {
        if (typeof sequenceName !== "string") throw new Error("DTO sequenceName is not string");
        const s = sequenceName.trim();
        if (s.length === 0) throw new Error("DTO sequenceName is empty");
        // normalize in-place
        arg.sequenceName = s;
    }

    // Validate and normalize instanceName if present
    if (typeof instanceName !== "undefined") {
        if (typeof instanceName !== "string") throw new Error("DTO instanceName is not string");
        const n = instanceName.trim();
        if (n.length === 0) throw new Error("DTO instanceName is empty");
        arg.instanceName = n;
    }

    // Backwards compatibility: deprecated `name` field is accepted only as alias for instanceName
    if (typeof arg.instanceName === "undefined" && typeof name !== "undefined") {
        if (typeof name !== "string") throw new Error("DTO name is not string");
        const n = name.trim();
        if (n.length === 0) throw new Error("DTO name is empty");
        // Map deprecated name -> instanceName
        arg.instanceName = n; // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    if (typeof required !== "undefined" && typeof required !== "boolean") {
        throw new Error("DTO required is not boolean");
    }

    if (typeof restartLimit !== "undefined") {
        if (typeof restartLimit !== "number" || !Number.isFinite(restartLimit) || restartLimit < 0 || !Number.isInteger(restartLimit)) {
            throw new Error("DTO restartLimit is not non-negative integer");
        }
    }

    if (exposePath && typeof exposePath !== "string") throw new Error("DTO exposePath is not string");

    if (Object.keys(rest).length > 0) throw new Error(`DTO has unknown ${Object.keys(rest)} keys`);

    return true;
}

// eslint-disable-next-line complexity
export function isStartSequenceEndpointPayloadDTO(arg: any): arg is StartSequenceEndpointPayloadDTO {
    if (typeof arg !== "object") {
        throw new Error("DTO is not an object");
    }
    const { appConfig, instanceId, instanceName, sequenceName, logLevel } = arg;

    if (!["object", "undefined"].includes(typeof appConfig))
        throw new Error(`DTO appConfig is ${typeof appConfig}, not an object`);
    if (instanceId !== undefined && typeof instanceId === "string" && instanceId.length !== 36)
        throw new Error("DTO instanceId is not 36 long");
    if (instanceId && typeof instanceId !== "string") {
        throw new Error("DTO instanceId is not valid string");
    }
    if (logLevel && !LogLevelStrings.includes(logLevel)) {
        throw new Error("DTO logLevel is not valid");
    }
    if (typeof instanceName !== "undefined") {
        if (typeof instanceName !== "string") throw new Error("DTO instanceName is not string");

        const normalizedInstanceName = instanceName.trim();

        if (normalizedInstanceName.length === 0) throw new Error("DTO instanceName is empty");

        arg.instanceName = normalizedInstanceName;
    }
    if (typeof sequenceName !== "undefined") {
        if (typeof sequenceName !== "string") throw new Error("DTO sequenceName is not string");

        const normalizedSequenceName = sequenceName.trim();

        if (normalizedSequenceName.length === 0) throw new Error("DTO sequenceName is empty");

        arg.sequenceName = normalizedSequenceName;
    }

    return true;
}
