import { TFunctionChain, WFunction, RFunction, TFunction } from "./functions";

/**
 * Minimal type of Sequence that doesn't read anything from the outside, doesn't
 * write anything to outside. It may be doing anything, but it's not able to report
 * the progress via streaming.
 */

export type InertSequence<Z = any, Y = any, X extends any[] = any[]> = TFunctionChain<Y, Z, X>;
/**
 * A Sequence of functions that accept some input, transforms it through
 * a number of functions and writes to some destination.
 */

export type WriteSequence<Consumes, Y extends any[] = any[], Z = any> =
    [WFunction<Consumes>] |
    [...TFunctionChain<Consumes, Z, Y>, WFunction<Z>];
/**
 * A sequence of functions reads input from a source and outputs it after
 * a chain of transforms.
 */

export type ReadSequence<Produces, Y extends any[] = any[], Z = any> =
    [RFunction<Produces>] |
    [RFunction<Z>, ...TFunctionChain<Z, Produces, Y>];
/**
 * A Transform Sequence is a Sequence that accept input, perform operations on it, and
 * outputs the result.
 */

export type TransformSeqence<Consumes, Produces, Z = any, X extends any[] = any[]> =
    [TFunction<Consumes, Produces>] |
    [...TFunctionChain<Consumes, Z, X>, TFunction<Z, Produces>];

export type TransformAppAcceptableSequence<Consumes, Produces> =
    TFunction<Consumes, Produces> |
    InertSequence |
    TransformSeqence<Consumes, Produces>
    ;

