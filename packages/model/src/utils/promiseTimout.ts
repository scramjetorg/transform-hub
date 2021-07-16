export const defer = (timeout: number): Promise<void> =>
    new Promise(res => setTimeout(res, timeout));

export const promiseTimeout = (endOfSequence: Promise<any>, timeout: number): Promise<any> => Promise.race([
    endOfSequence,
    defer(timeout)
        .then(() => Promise.reject())
]);
