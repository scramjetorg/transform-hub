import { exposeSequenceSymbol } from "@scramjet/symbols";
import { MaybePromise, ReadableStream, Streamable } from "./utils";
import { AppContext } from "./app-context";
import { AppConfig } from "./app-config";

export type ApplicationInterface =
    (this: AppContext<AppConfig, any>, source: ReadableStream<any>, ...argv: any[])
        => MaybePromise<Streamable<any>|void>;

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
    AppConfigType extends AppConfig = AppConfig,
    ReturnType = Streamable<Produces>
    > = (
        this: AppContext<AppConfigType, S>,
        source: ReadableStream<Consumes>,
        ...args: Z
    ) => MaybePromise<ReturnType>;
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
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void
    > = TransformApp<VoidType, Produces, Z, S, AppConfigType>;
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
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void
    > = TransformApp<Consumes, VoidType, Z, S, AppConfigType, void>;

/**
 * An Inert App is an app that doesn't accept data from the platform and doesn't output it.
 *
 * @interface
 */
export type InertApp<
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void
    > = TransformApp<VoidType, VoidType, Z, S, AppConfigType, void>;

export type ApplicationFunction = ReadableApp | WritableApp | TransformApp | InertApp;

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

export type ApplicationExpose<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig
    > = {
        [exposeSequenceSymbol]: Application<Consumes, Produces, Z, S, AppConfigType>;
    };
