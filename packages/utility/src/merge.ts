import { DeepPartial } from "@scramjet/types";

/**
 * Deep merge objects.
 * Copies all properties from source to target.
 *
 * @param {Record<string, unknown>} target Target object.
 * @param {DeepPartial<Record<string, unknown>>} source Source object.
 * @returns {undefined} Returns nothing.
 */
export const merge = <T extends Record<string, unknown>>(target: T, source: DeepPartial<T> = {}) => Object.keys(source)
    .forEach((key: keyof T) => {
        if (typeof source[key] === "object" && !Array.isArray(source[key])) {
            merge(target[key] as Record<string, unknown>, source[key]);
        } else if (source[key]) {
            target[key] = source[key] as T[keyof T];
        }
    });
