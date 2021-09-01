/**
 * App configuration primitive.
 */

export type AppConfig = { [key: string]: null | string | number | boolean | AppConfig; };
