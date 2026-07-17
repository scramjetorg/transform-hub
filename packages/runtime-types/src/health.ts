/** Runtime-neutral detailed health contract shared by sequence runtimes. */
export type HealthDetails = Record<string, unknown>;

export type HealthPayload = {
    healthy: boolean;
    details: HealthDetails;
};

export const HEALTH_DETAILS_MAX_BYTES = 16_384;
export const HEALTH_NAMESPACE = /^[a-z](?:[a-z0-9]|[._-][a-z0-9])*$/;
export const HEALTH_RESERVED_FIELDS = new Set(["healthy", "details", "status", "scope", "components"]);

export class HealthContractError extends Error {
    constructor(
        public code:
            | "ERR_HEALTH_DETAILS_INVALID"
            | "ERR_HEALTH_DETAILS_DUPLICATE_NAMESPACE"
            | "ERR_HEALTH_DETAILS_RESERVED_FIELD"
            | "ERR_HEALTH_DETAILS_TOO_LARGE"
            | "ERR_HEALTH_DETAILS_SERIALIZATION",
        message: string
    ) {
        super(message);
        this.name = "HealthContractError";
    }
}

function invalid(message: string): never {
    throw new HealthContractError("ERR_HEALTH_DETAILS_INVALID", message);
}

function validateDetails(details: unknown): asserts details is HealthDetails {
    if (!details || typeof details !== "object" || Array.isArray(details)) invalid("health details must be an object");

    for (const namespace of Object.keys(details)) {
        if (!HEALTH_NAMESPACE.test(namespace)) {
            throw new HealthContractError("ERR_HEALTH_DETAILS_INVALID", `invalid health namespace: ${namespace}`);
        }
        if (HEALTH_RESERVED_FIELDS.has(namespace)) {
            throw new HealthContractError("ERR_HEALTH_DETAILS_RESERVED_FIELD", `reserved health field: ${namespace}`);
        }
    }
}

function encodeDetails(details: HealthDetails): Buffer {
    try {
        const encoded = JSON.stringify(details);
        if (encoded === undefined) throw new Error("health details are not serializable");
        return Buffer.from(encoded, "utf8");
    } catch (error) {
        throw new HealthContractError(
            "ERR_HEALTH_DETAILS_SERIALIZATION",
            `health details are not serializable: ${error instanceof Error ? error.message.slice(0, 160) : "unknown value"}`
        );
    }
}

/** Validate and deterministically merge handler results into the wire payload. */
export function mergeHealthOutputs(outputs: unknown[]): HealthPayload {
    const details: HealthDetails = {};
    let healthy = true;
    for (const output of outputs) {
        if (typeof output === "boolean") {
            healthy = healthy && output;
            continue;
        }
        if (!output || typeof output !== "object" || Array.isArray(output)) invalid("health handler output must be an object");
        const value = output as Record<string, unknown>;
        if (typeof value.healthy !== "boolean") invalid("health handler output must contain healthy:boolean");
        for (const key of Object.keys(value)) {
            if (key !== "healthy" && key !== "details") {
                if (HEALTH_RESERVED_FIELDS.has(key)) {
                    throw new HealthContractError("ERR_HEALTH_DETAILS_RESERVED_FIELD", `reserved health field: ${key}`);
                }
                invalid(`unsupported health top-level field: ${key}`);
            }
        }
        const outputDetails = value.details === undefined ? {} : value.details;
        validateDetails(outputDetails);
        healthy = healthy && value.healthy;

        for (const namespace of Object.keys(outputDetails).sort()) {
            if (Object.prototype.hasOwnProperty.call(details, namespace)) {
                throw new HealthContractError("ERR_HEALTH_DETAILS_DUPLICATE_NAMESPACE", `duplicate health namespace: ${namespace}`);
            }
            details[namespace] = outputDetails[namespace];
        }
    }

    const encoded = encodeDetails(details);
    if (encoded.byteLength > HEALTH_DETAILS_MAX_BYTES) {
        throw new HealthContractError("ERR_HEALTH_DETAILS_TOO_LARGE", "health details exceed 16384 UTF-8 bytes");
    }

    return {
        healthy,
        details: Object.fromEntries(
            Object.keys(details)
                .sort()
                .map((key) => [key, details[key]])
        )
    };
}
