/** Docker reports both an already stopped and an already removed container as lifecycle conflicts. */
export function isAlreadyGoneContainerError(error: any): boolean {
    return error?.statusCode === 304 || error?.statusCode === 404;
}

/**
 * Docker volume removal returns 404 when the volume is already gone.
 * Unlike containers, volumes never report 304, so only 404 is accepted.
 */
export function isAlreadyGoneVolumeError(error: any): boolean {
    return error?.statusCode === 404;
}
