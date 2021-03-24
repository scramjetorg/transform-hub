import { CeroError } from "./definitions";

export const mimeCompare = (accepted: string[], served: string[]): (string | undefined) => {
    for (let item of accepted) {
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

export const mimeAccepts = (accepted: string|undefined, served: string[]): string => {
    if (!accepted) return served[0];

    const list = accepted.split(",");
    const res = mimeCompare(list, served);

    if (res) return res;
    throw new CeroError("ERR_INVALID_CONTENT_TYPE");
};
