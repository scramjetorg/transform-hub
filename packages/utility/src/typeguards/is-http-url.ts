import { URL } from "url";

/**
 * Function checking if provided string is valid http url
 *
 * Example valid paterns: http[s]://hostname[:port][/path] etc.
 * @param {string} urlString url to check
 * @returns {boolean} true if url is valid
 */
export const isHttpUrl = (urlString: string): boolean => {
    try {
        const url = new URL(urlString);

        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
};
