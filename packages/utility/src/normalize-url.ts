import normalize, { Options } from "normalize-url";

/**
 * Normalizes provided URL.
 *
 * @param {string} url URL to be normalized.
 * @param {Options} [options] Normalization options.
 * @returns {string} Normalized URL.
 */
export function normalizeUrl(url: string, options?: Options): string {
    const fullOptions = options || { defaultProtocol: "http:" };

    // See https://www.npmjs.com/package/normalize-url.
    return normalize(url, fullOptions);
}
