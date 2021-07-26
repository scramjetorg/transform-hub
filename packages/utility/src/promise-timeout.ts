import { defer } from "./defer";

export const promiseTimeout = <T extends unknown>(promise: Promise<T>, timeout: number): Promise<T> => Promise.race([
    promise,
    defer(timeout)
        .then(() => Promise.reject())
]);
