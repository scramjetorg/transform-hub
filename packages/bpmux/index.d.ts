import { ClientHttp2Session, ServerHttp2Session } from "http2"
import { Duplex, DuplexOptions } from "stream";
import { EventEmitter } from "events";

declare class Http2Sessions
{
    constructor(client: ClientHttp2Session, server: ServerHttp2Session)
    get client(): ClientHttp2Session
    get server(): ServerHttp2Session
}

type BPDuplexOption = DuplexOptions & {
    max_write_size?: number;
    check_read_overflow?: boolean;
    handshake_data?: Buffer;
    channel?: number;
}

type Encoding = 'utf8' | 'ascii' | 'latin1' | 'base64' | 'hex' | 'binary';

declare class BPDuplex extends Duplex {
    constructor(options: DuplexOptions, mux: BPMux, chan: number);

    readonly _chan: number;

    private _check_remove(): void
    private _send_handshake(handshake_data?: Buffer): void
    get_channel(): number
    read(size: number, send_status?: boolean): Buffer | null;
    peer_error_then_end(chunk: Buffer, encoding: string, cb: () => void): void
}

export type PeerMultiplexOptions = {
    /** Maximum number of bytes to write to the `Duplex` at once, regardless of how many bytes the peer is free to receive. Defaults to 0 (no limit). */
    max_write_size: number;
    /** Whether to check if more data than expected is being received. If `true` and the `Duplex`'s high-water mark for reading is exceeded then the `Duplex` emits an `error` event. This should not normally occur unless you add data yourself using [`readable.unshift`](http://nodejs.org/api/stream.html#stream_readable_unshift_chunk) &mdash; in which case you should set `check_read_overflow` to `false`. Defaults to `true`. */
    check_read_overflow: boolean;
}

export type BPMuxOptions = {
    /** When your `BPMux` object detects a new multiplexed stream from the peer on the carrier, it creates a new `Duplex` and emits a [`peer_multiplex`](#bpmuxeventspeer_multiplexduplex) event. When it creates the `Duplex`, it uses `peer_multiplex_options` to configure it with the following options: */
    peer_multiplex_options: PeerMultiplexOptions;
    /** When a new stream is multiplexed, the `BPMux` objects at each end of the carrier exchange a handshake message. You can supply application-specific handshake data to add to the handshake message (see [`BPMux.prototype.multiplex`](#bpmuxprototypemultiplexoptions) and [`BPMux.events.handshake`](#bpmuxeventshandshakeduplex-handshake_data-delay_handshake)). By default, when handshake data from the peer is received, it's passed to your application as a raw [`Buffer`](https://nodejs.org/api/buffer.html#buffer_buffer). Use `parse_handshake_data` to specify a custom parser. It will receive the `Buffer` as an argument and should return a value which makes sense to your application. */
    parse_handshake_data: (handshake_data: any) => void
    /** Whether to batch together writes to the carrier. When the carrier indicates it's ready to receive data, its spare capacity is shared equally between the multiplexed streams. By default, the data from each stream is written separately to the carrier. Specify `true` to write all the data to the carrier in a single write. Depending on the carrier, this can be more performant. */
    coalesce_writes: boolean
    /** `BPMux` assigns unique channel numbers to multiplexed streams. By default, it assigns numbers in the range [0..2^31). If your application can synchronise the two `BPMux` instances on each end of the carrier stream so they never call [`multiplex`](https://github.com/davedoesdev/bpmux#bpmuxprototypemultiplexoptions) at the same time then you don't need to worry about channel number clashes. For example, one side of the carrier could always call [`multiplex`](https://github.com/davedoesdev/bpmux#bpmuxprototypemultiplexoptions) and the other listen for [`handshake`](https://github.com/davedoesdev/bpmux#bpmuxeventshandshakeduplex-handshake_data-delay_handshake) events. Or they could take it in turns. If you can't synchronise both sides of the carrier, you can get one side to use a different range by specifying `high_channels` as `true`. The `BPMux` with `high_channels` set to `true` will assign channel numbers in the range [2^31..2^32). */
    high_channels: boolean
    /** Maximum number of multiplexed streams that can be open at a time. Defaults to 0 (no maximum). */
    max_open: number
    /** `BPMux` adds a control header to each message it sends, which the receiver reads into memory. The header is of variable length &mdash; for example, handshake messages contain handshake data which can be supplied by the application. `max_header_size` is the maximum number of header bytes to read into memory. If a larger header is received, `BPMux` emits an `error` event. Defaults to 0 (no limit). */
    max_header_size: number
    /** Send a single byte keep-alive message every N milliseconds. Defaults to 30000 (30 seconds). Pass `false` to disable. */
    keep_alive?: number
}

type Events = {
    error(error: Error): void;
    peer_multiplex(duplex: BPDuplex, data: any): void;
    handshake(duplex, handshake_data, delay_handshake);
    handshake_sent(duplex, complete);
    drain();
    end();
    finish();
    full();
    removed(duplex);
    keep_alive();
};

declare class BPMux extends EventEmitter {
    constructor(carrier: Duplex | Http2Sessions, options?: BPMuxOptions);
    private _check_buffer(buf: Buffer, size: number): boolean
    private _process_header(buf: Buffer): void
    private _remove(duplex: BPDuplex): void
    private _send_keep_alive(): void
    private _send_end(duplex: BPDuplex): void
    private _send_handshake(duplex: BPDuplex, handshake_data?: Buffer): void
    private _send_status(duplex: BPDuplex): void
    private __send(): void
    private _send(): void
    private _send_requested: boolean;
    multiplex(options?: BPDuplexOption): BPDuplex;
    private _add_http2_duplex(duplex: BPDuplex, channel: number): void;
    private _make_http2_handshake(handshake: Buffer): object;
    private _parse_http2_handshake(duplex: BPDuplex, headers: object, delay_handshake: boolean): void

}

