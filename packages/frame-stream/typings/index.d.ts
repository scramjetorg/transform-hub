import { Transform } from "stream";

export interface DecodeOptions {
    /**
     * The length in bytes of the prepended message size.
     * @default 4
     */
    lengthSize?: number;

    /**
     * The function used to read the prepended message size. This function defaults to `readInt8()`, `readInt16BE()`
     * or `readInt32BE()` according to the `lengthSize`.
     */
    getLength?: (buffer: Buffer) => number;

    /**
     * The maximum allowed message size. This can be used to prevent denial-of-service attacks (`0` = turned off).
     * @default 0
     */
    maxSize?: number;

    /**
     * Return parts of a message as they arrive, rather than buffering them up until the last part arrives.
     * Useful when you know messages will be large. Each part will be a `Buffer` with the following extra properties:
     *
     * - **framePos** - The index in the message where this part starts. Parts will be returned in order.
     * - **frameLength** - The total message size.
     * - **frameEnd** - A boolean indicating whether this is the last part of the message.
     * @default false
     */
    unbuffered?: boolean;
}

export interface EncodeOptions {
    /**
     * The length in bytes of the prepended message size.
     * @default 4
     */
    lengthSize?: number;

    /**
     * The function used to write the prepended message size. This function defaults to `writeInt8()`, `writeInt16BE()` or
     * `writeInt32BE()` according to the `lengthSize`.
     */
    setLength?: (buffer: Buffer, value: number) => number;
}

export class Decoder extends Transform {
    constructor(opts?: DecodeOptions);
}

export class Encoder extends Transform {
    constructor(opts?: EncodeOptions);
}

/**
 * This is an alias for `new frame.Decoder(opts)`
 */
export function decode(opts?: DecodeOptions): Decoder;

/**
 * This is an alias for `new frame.Encoder(opts)`
 */
export function encode(opts?: EncodeOptions): Encoder;
