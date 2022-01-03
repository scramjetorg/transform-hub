/**
 * Returns true if given value is defined.
 *
 * @param {any} value Value to check.
 * @returns {boolean} Returns true if given value is defined.
 */
export function isDefined<T extends unknown>(value: T | undefined | null): value is T {
    return typeof value !== "undefined" && value !== null;
}
