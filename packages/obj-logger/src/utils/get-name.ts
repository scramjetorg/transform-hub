// eslint-disable-next-line complexity
function getActualName(nameSource: any): string {
    if (!nameSource)
        return "logger";

    if (typeof nameSource === "string")
        return nameSource;

    if (typeof nameSource === "function" && nameSource.prototype && nameSource === nameSource.prototype.constructor) {
        return `class:${nameSource.name}`;
    }

    if (typeof nameSource.name === "string")
        return `${typeof nameSource}:${nameSource.name}`;

    // eslint-disable-next-line no-proto
    const proto = Object.getPrototypeOf(nameSource);

    if (proto && proto.constructor && proto.constructor.name)
        return `${proto.constructor.name}`;

    return "logger";
}

/**
 * Gets a friendly name from any arg
 *
 * @param item - any name
 * @returns the resulting string
 */
export function getName(item: any) {
    return getActualName(item).replace(/\r?\n[\s\S]*$/g, "").replace(/[\s]+/g, ":");
}
