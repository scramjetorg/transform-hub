import { DeepPartial } from "@scramjet/types";

/**
 * Deep merge objects.
 * Copies all properties from source to target.
 *
 * @param target Target object.
 * @param source Source object.
 * @param strict Throws an error if unknown value is found
 * @returns Returns nothing.
 */
export const merge = <T extends Record<string, unknown>>(
    target: T, source: DeepPartial<T> = {}, strict: boolean = false
) => Object.keys(source)
        .forEach((key: keyof T) => {
            if (typeof source[key] === "object" && !Array.isArray(source[key])) {
                merge(target[key] as Record<string, unknown>, source[key]);
            } else if (source[key] !== undefined) {
                target[key] = source[key] as T[keyof T];
            } else if (strict) {
                throw new Error(`Unkown option ${String(key)} in config`);
            }
        });
