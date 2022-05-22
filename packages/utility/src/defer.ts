/**
 * Returns a promise that resolves after the specified duration.
 * @example
 * // waits for 10 second
 * await defer(10 * 1000);
 *
 * @param {number} timeout - timeout in milliseconds.
 * @returns {Promise<void>} - promise that resolves after timeout.
 */
export const defer = (timeout?: number): Promise<void> =>
    timeout ? new Promise(res => setTimeout(res, timeout)) : Promise.resolve();

export type CancellablePromise = Promise<void> & {
    cancel(): boolean;
};

export const cancellableDefer = (timeout?: number): CancellablePromise => {
    let resolver: () => void;
    let to: any;

    const ret = new Promise<void>(res => {
        resolver = res;
        to = setTimeout(res, timeout);
    });

    return Object.assign(
        ret,
        {
            cancel() {
                clearTimeout(to);
                if (resolver) {
                    resolver();
                    return true;
                }
                return false;
            }
        });
}
;
