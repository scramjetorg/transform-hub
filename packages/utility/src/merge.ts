import { DeepPartial } from "@scramjet/runtime-types";

const unsafeKeys = new Set(["__proto__", "constructor", "prototype"]);

const hasOwn = (object: object, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(object, key);

const isMergeableObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Deep merge objects.
 * Copies all properties from source to target.
 *
 * @param target Target object.
 * @param source Source object.
 * @param strict Throws an error if an unknown source option is found.
 * @returns Returns nothing.
 */
export const merge = <T extends Record<string, unknown>>(
    target: T, source: DeepPartial<T> = {}, strict: boolean = false
) => {
    for (const key of Object.getOwnPropertyNames(source)) {
        if (unsafeKeys.has(key)) {
            if (strict) {
                throw new Error(`Unknown option ${key} in config`);
            }
            continue;
        }

        if (strict && !hasOwn(target, key)) {
            throw new Error(`Unknown option ${key} in config`);
        }

        const sourceValue = source[key as keyof T];
        if (isMergeableObject(sourceValue)) {
            const targetValue = target[key as keyof T];
            if (!isMergeableObject(targetValue)) {
                target[key as keyof T] = {} as T[keyof T];
            }
            merge(target[key as keyof T] as Record<string, unknown>, sourceValue, strict);
        } else if (sourceValue !== undefined) {
            target[key as keyof T] = sourceValue as T[keyof T];
        }
    }
}
