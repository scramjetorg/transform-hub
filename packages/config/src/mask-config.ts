import type { ConfigOptionDescriptor, ConfigPath } from "./index";

/**
 * Checks if a value is a plain object (not null, not array, not a Promise etc.).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-clones a value. Arrays and plain objects are recursively cloned;
 * primitives are returned as-is.
 */
function cloneValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(cloneValue);
    if (!isPlainObject(value)) return value;

    return Object.keys(value).reduce(
        (copy, key) => {
            copy[key] = cloneValue(value[key]);
            return copy;
        },
        {} as Record<string, unknown>
    );
}

/**
 * Converts a ConfigPath (dot-string or array) into an array of path segments.
 */
function toPath(path: ConfigPath): string[] {
    return typeof path === "string" ? path.split(".") : [...path];
}

/**
 * Walks a nested object structure following `path` and returns the value
 * at the end, or `undefined` if any intermediate value is not a plain object.
 */
function getPath(target: unknown, path: readonly string[]): unknown {
    return path.reduce((cursor, part) => (isPlainObject(cursor) ? cursor[part] : undefined), target);
}

/**
 * Sets a value at the given dotted/nested path inside `target`, creating
 * intermediate plain objects as needed.
 */
function setPath(target: unknown, path: readonly string[], value: unknown): void {
    let cursor = target as Record<string, unknown>;

    path.slice(0, -1).forEach((part) => {
        if (!isPlainObject(cursor[part])) cursor[part] = {};
        cursor = cursor[part] as Record<string, unknown>;
    });

    cursor[path[path.length - 1]] = value;
}

/**
 * Deep-clones the given value and replaces any value whose option descriptor
 * has `secret: true` with the provided mask string (default `"********"`).
 *
 * @param value    The input object to mask (will be cloned).
 * @param options  Option descriptors that may contain `secret` flags.
 * @param mask     The replacement string (default `"********"`).
 */
export function maskConfig(value: unknown, options: readonly ConfigOptionDescriptor[], mask = "********"): unknown {
    const clone = cloneValue(value);

    options
        .filter((option) => option.secret)
        .forEach((option) => {
            const path = toPath(option.path || option.name);

            if (getPath(clone, path) !== undefined) setPath(clone, path, mask);
        });

    return clone;
}
