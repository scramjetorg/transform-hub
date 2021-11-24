export function isDefined<T extends unknown>(value: T | undefined | null): value is T {
    return typeof value !== 'undefined' && value !== null
}