import { defer } from "./defer";

/**
 * Returns a promise rejecting after the specified timeout or a given promise.
 *
 * @param {Promise} promise Promise to wait for.
 * @param {number} timeout Timeout in milliseconds.
 * @param {any} rejectValue Value to reject with after timeout.
 * @returns {Promise} Promise that reject after timeout or.
 */
export const promiseTimeout = <T extends unknown>(promise: Promise<T>, timeout: number, rejectValue: any = undefined): Promise<T> => Promise.race([
    promise,
    defer(timeout)
        .then(() => Promise.reject(rejectValue))
]);
