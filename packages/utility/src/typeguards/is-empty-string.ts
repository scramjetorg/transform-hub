/**
 * Returns true if given value is string and is empty.
 *
 * @param {any} value Value to check.
 * @returns {boolean} Returns true if given value is empty string.
 */
export function isEmptyString(value: string) {
    return typeof value === "string" && value === "";
}
