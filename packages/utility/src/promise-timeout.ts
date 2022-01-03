import { defer } from "./defer";

/**
 * Returns a promise rejecting after the specified timeout or a given promise.
 *
 * @param {Promise} promise Promise to wait for.
 * @param {number} timeout Timeout in milliseconds.
 * @returns {Promise} Promise that reject after timeout or.
 */
export const promiseTimeout = <T extends unknown>(promise: Promise<T>, timeout: number): Promise<T> => Promise.race([
    promise,
    defer(timeout)
        .then(() => Promise.reject())
]);
