/** Docker reports both an already stopped and an already removed container as lifecycle conflicts. */
export function isAlreadyGoneContainerError(error: any): boolean {
    return error?.statusCode === 304 || error?.statusCode === 404;
}
