import {
    AsyncGen,
    StreambleMaybeFunction,
    Gen,
    MaybePromise,
    Streamable,
    ReadableStream
} from ".";

/**
 * A Function that returns a streamable result is a read function
 */
export type ReadFunction<Produces> =
    (...parameters: any[]) => Streamable<Produces>;
export type WriteFunction<Consumes> =
    (stream: ReadableStream<Consumes>, ...parameters: any[]) => MaybePromise<void>;
export type TranformFunction<Consumes, Produces> = (
    stream: ReadableStream<Consumes>,
    ...parameters: any[]
) => StreambleMaybeFunction<Produces>;

export type RFunction<Produces> = Streamable<Produces> | ReadFunction<Produces>;
export type TFunction<Consumes, Produces> =
    AsyncGen<Produces, Consumes> |
    Gen<Produces, Consumes> |
    TranformFunction<Consumes, Produces>;
export type WFunction<Consumes> = TFunction<Consumes, never>;

type MulTFunction<T, S, W = any, X = any, Y = any> =
    [TFunction<T, S>] |
    [TFunction<T, Y>, TFunction<Y, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, W>, TFunction<W, S>] |
    never;

// eslint-disable-next-line no-use-before-define, @typescript-eslint/no-unused-vars
type MulMulTFunction<T, S, Y = any, X = any, W = any, A = any, B = any, C = any, D = any, E = any, F = any> =
    [TFunction<T, Y>, TFunction<Y, S>] |
    [TFunction<T, Y>, TFunction<Y, X>, TFunction<X, S>] |
    [TFunction<T, Y>, ...MulTFunction<Y, X, A, B, C>, TFunction<X, S>] |
    [TFunction<T, Y>, ...MulTFunction<Y, X, A, B, C>, ...MulTFunction<X, W, D, E, F>, TFunction<W, S>];

export type TFunctionChain<Consumes, Produces, Z extends any[]> =
    [TFunction<Consumes, Produces>] |
    [...MulMulTFunction<Consumes, Produces, Z>];
