import { exposeSequenceSymbol } from "@scramjet/symbols";
import {
    MaybePromise,
    ReadableStream
} from ".";
import { AppContext } from "./app-context";
import { Streamable } from "./utils";

/**
 * App configuration primitive.
 */
export type AppConfig = { [key: string]: null | string | number | boolean | AppConfig };

/**
 * A Transformation App that accepts data from the platform, performs operations on the data,
 * and returns the data to the platforms for further use.
 *
 * Has both active readable and writable sides.
 *
 * @interface
 */

export type TransformApp<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => Streamable<Produces>;
/**
 * A Readable App is an app that obtains the data by it's own means and preforms
 * 0 to any number of transforms on that data before returning it.
 *
 * @interface
 */

export type ReadableApp<
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<never>,
        ...args: Z
    ) => MaybePromise<Streamable<Produces>>;
/**
 * A Writable App is an app that accepts the data from the platform, performs any number
 * of transforms and then saves it to the data destination by it's own means.
 *
 * @interface
 */

export type WritableApp<
    Consumes = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<void>;
/**
 * An Inert App is an app that doesn't accept data from the platform and doesn't output it.
 *
 * @interface
 */

export type InertApp<
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<void>,
        ...args: Z
    ) => MaybePromise<void>;

export type ApplicationExpose<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = {
        // Because we need this a bit lower again, so it's an egg-hen problem.
        // eslint-disable-next-line no-use-before-define
        [exposeSequenceSymbol]: Application<Consumes, Produces, Z, S, AppConfigType>;
    };
/**
 * Application is an acceptable input for the runner.
 *
 * @interface
 */

export type Application<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > =
    TransformApp<Consumes, Produces, Z, S, AppConfigType> |
    ReadableApp<Produces, Z, S, AppConfigType> |
    WritableApp<Consumes, Z, S, AppConfigType> |
    InertApp<Z, S>;
