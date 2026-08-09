import { exposeSequenceSymbol } from "@scramjet/symbols";
import { MaybePromise, ReadableStream, Streamable, AppConfig } from "@scramjet/runtime-types";
import { SequenceAppContext } from "./app-context";

/**
 * Sequence-author application function type.
 */
export type SequenceApplicationInterface =
    (this: SequenceAppContext<AppConfig, any>, source: ReadableStream<any>, ...argv: any[])
        => MaybePromise<Streamable<any> | void>;

/**
 * A transformation App for sequence authors.
 */
export type SequenceTransformApp<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    ReturnType = Streamable<Produces>,
    HubClientType = unknown,
    SpaceClientType = unknown
> = (
    this: SequenceAppContext<AppConfigType, S, HubClientType, SpaceClientType>,
    source: ReadableStream<Consumes>,
    ...args: Z
) => MaybePromise<ReturnType>;

/**
 * A readable App for sequence authors.
 */
export type SequenceReadableApp<
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void,
    HubClientType = unknown,
    SpaceClientType = unknown
> = SequenceTransformApp<VoidType, Produces, Z, S, AppConfigType, Streamable<Produces>, HubClientType, SpaceClientType>;

/**
 * A writable App for sequence authors.
 */
export type SequenceWritableApp<
    Consumes = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void,
    HubClientType = unknown,
    SpaceClientType = unknown
> = SequenceTransformApp<Consumes, VoidType, Z, S, AppConfigType, void, HubClientType, SpaceClientType>;

/**
 * An inert App (no I/O) for sequence authors.
 */
export type SequenceInertApp<
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    VoidType = void,
    HubClientType = unknown,
    SpaceClientType = unknown
> = SequenceTransformApp<VoidType, VoidType, Z, S, AppConfigType, void, HubClientType, SpaceClientType>;

/**
 * Union of all sequence application function types.
 */
export type SequenceApplicationFunction = SequenceReadableApp | SequenceWritableApp | SequenceTransformApp | SequenceInertApp;

/**
 * Application type acceptable as sequence input for the runner.
 */
export type SequenceApplication<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    HubClientType = unknown,
    SpaceClientType = unknown
> =
    SequenceTransformApp<Consumes, Produces, Z, S, AppConfigType, Streamable<Produces>, HubClientType, SpaceClientType> |
    SequenceReadableApp<Produces, Z, S, AppConfigType, void, HubClientType, SpaceClientType> |
    SequenceWritableApp<Consumes, Z, S, AppConfigType, void, HubClientType, SpaceClientType> |
    SequenceInertApp<Z, S, AppConfigType, void, HubClientType, SpaceClientType>;

/**
 * Object-exposed sequence with the `exposeSequenceSymbol` marker.
 */
export type SequenceApplicationExpose<
    Consumes = any,
    Produces = any,
    Z extends any[] = any[],
    S extends any = any,
    AppConfigType extends AppConfig = AppConfig,
    HubClientType = unknown,
    SpaceClientType = unknown
> = {
    [exposeSequenceSymbol]: SequenceApplication<Consumes, Produces, Z, S, AppConfigType, HubClientType, SpaceClientType>;
};
