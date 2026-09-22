
type SimpleType = null | string | number | boolean;

type MaybeArray<T> = T | T[];

/**
 * App configuration primitive.
 */

export type AppConfig = {
    /** Prevent publication to the Hub's aggregate log stream for this instance. */
    logForward?: boolean;
    [key: string]: MaybeArray<SimpleType> | MaybeArray<AppConfig> | undefined;
};
