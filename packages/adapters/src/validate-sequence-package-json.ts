import { SequencePackageJSON } from "@scramjet/types";

function isOptionalString(value: unknown): value is string | undefined {
    return !value || typeof value === "string";
}

function isValidPortsConfiguration(ports: unknown): ports is `${number}/${"tcp" | "udp"}`[] {
    if (!Array.isArray(ports)) {
        return false;
    }

    return ports.every(entry => typeof entry === "string" && (/^\d{3,5}\/(tcp|udp)$/).test(entry));
}

// @TODO rewrite it using decoding library like https://github.com/joanllenas/ts.data.json
// eslint-disable-next-line complexity
export function isValidSequencePackageJSON(value: unknown): value is SequencePackageJSON {
    if (typeof value !== "object") {
        return false;
    }

    const v = value as SequencePackageJSON;

    const enginesAreValid = !v.engines ||
        typeof v.engines === "object" &&
        Object.values(v.engines).every(val => typeof val === "string");

    const scramjetConfigIsValid = !v.scramjet ||
        isOptionalString(v.scramjet.image) &&
        (!v.scramjet.config ||
            typeof v.scramjet.config.ports === "object" &&
            isValidPortsConfiguration(v.scramjet.config.ports)
        );

    return enginesAreValid &&
        scramjetConfigIsValid &&
        typeof v.main === "string" &&
        isOptionalString(v.name) &&
        isOptionalString(v.version);
}
