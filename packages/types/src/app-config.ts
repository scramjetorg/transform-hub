
type SimpleType = null | string | number | boolean;

type MaybeArray<T> = T | T[];

/**
 * App configuration primitive.
 */

export type AppConfig = { [key: string]: MaybeArray<SimpleType> | MaybeArray<AppConfig>; };
