import { CeroError } from "./definitions";

/**
 * Checks if any of served mime type is defined in accepted mime types.
 *
 * @param {string[]} accepted Accepted mime types.
 * @param {string[]} served Served mime types.
 * @returns First common mime type or undefined if none is found.
 */
export const mimeCompare = (accepted: string[], served: string[]): (string | undefined) => {
    for (const item of accepted) {
        const [mime] = item.split(";");

        if (served.includes(mime)) return mime;
        if (mime.includes("*")) {
            const mimeFrag = mime.replace(/\*.*$/, "");
            const found = served.find(type => type.startsWith(mimeFrag));

            if (found) return found;
        }
    }

    return undefined;
};

/**
 * Returns first accepted mime type found.
 *
 * @param {string|undefined} accepted Accepted mime types.
 * @param {string[]} served Served mime types.
 * @returns First accepted mime type.
 * @throws {CeroError} If no mime type is accepted.
 */
export const mimeAccepts = (accepted: string|undefined, served: string[]): string | never => {
    if (!accepted) {
        return served[0];
    }

    const list = accepted.split(",");
    const res = mimeCompare(list, served);

    if (res) {
        return res;
    }

    throw new CeroError("ERR_INVALID_CONTENT_TYPE");
};
