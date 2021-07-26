export const defer = (timeout: number): Promise<void> =>
    new Promise(res => setTimeout(res, timeout));
