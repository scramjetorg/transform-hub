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
    ReturnType = Streamable<Produces>,
    HubClientType extends object = object,
    SpaceClientType extends object = object
    > = (
        this: AppContext<AppConfigType, S, HubClientType, SpaceClientType>,
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
    VoidType = void,
    HubClientType extends object = object,
    SpaceClientType extends object = object
    > = TransformApp<VoidType, Produces, Z, S, AppConfigType, Streamable<Produces>, HubClientType, SpaceClientType>;
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
    VoidType = void,
    HubClientType extends object = object,
    SpaceClientType extends object = object
    > = TransformApp<Consumes, VoidType, Z, S, AppConfigType, void, HubClientType, SpaceClientType>;

/**
 * An Inert App is an app that doesn't accept data from the platform and doesn't output it.
 *
 * @interface
 */
export type InertApp<
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void,
    HubClientType extends object = object,
    SpaceClientType extends object = object
    > = TransformApp<VoidType, VoidType, Z, S, AppConfigType, void, HubClientType, SpaceClientType>;

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
    AppConfigType extends AppConfig = AppConfig,
    HubClientType extends object = object,
    SpaceClientType extends object = object
    > =
    TransformApp<Consumes, Produces, Z, S, AppConfigType, Streamable<Produces>, HubClientType, SpaceClientType> |
    ReadableApp<Produces, Z, S, AppConfigType, void, HubClientType, SpaceClientType> |
    WritableApp<Consumes, Z, S, AppConfigType, void, HubClientType, SpaceClientType> |
    InertApp<Z, S, AppConfigType, void, HubClientType, SpaceClientType>;

export type ApplicationExpose<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    HubClientType extends object = object,
    SpaceClientType extends object = object
    > = {
        [exposeSequenceSymbol]: Application<Consumes, Produces, Z, S, AppConfigType, HubClientType, SpaceClientType>;
    };
