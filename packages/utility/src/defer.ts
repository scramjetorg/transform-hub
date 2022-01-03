/**
 * Returns a promise that resolves after the specified duration.
 * @example
 * // waits for 10 second
 * await defer(10 * 1000);
 *
 * @param {number} timeout - timeout in milliseconds
 * @returns {Promise<void>} - promise that resolves after timeout
 */
export const defer = (timeout: number): Promise<void> =>
    new Promise(res => setTimeout(res, timeout));
