/**
 * Local channel bridge server for runtime children.
 *
 * Phase 3 slice: listens on 127.0.0.1:0 and accepts the existing HostClient
 * 37-byte header protocol (36-byte instance ID + 1-byte channel index).
 * Supports collecting streams for CC.IN, CC.OUT, CC.LOG (and CC.REQUESTS as
 * reserved). Exposes start(), close(), port/address, getStream(channel) and
 * waitForStream(channel, timeout?).
 *
 * Not yet wired into start-runner.ts.
 */

import { CommunicationChannel as CC } from "@scramjet/symbols";
import net from "net";

/** Channels that a runtime child is expected/authorized to open. */
const SUPPORTED_CHANNELS = new Set<CC>([CC.IN, CC.OUT, CC.LOG]);

/** Channels reserved for future use (accepted and stored but not special-cased). */
const RESERVED_CHANNELS = new Set<CC>([CC.REQUESTS]);

const HEADER_LEN = 37;
const ID_LEN = 36;

export interface LocalChannelServerOptions {
    /**
     * If set, incoming connections are validated against this instance ID.
     * Connections with mismatched IDs are rejected (socket destroyed).
     */
    expectedInstanceId?: string;
}

export class LocalChannelServer {
    private server: net.Server | null = null;
    private sockets = new Set<net.Socket>();
    private channels = new Map<CC, net.Socket>();
    private waiters = new Map<CC, Array<{
        resolve: (socket: net.Socket) => void;
        reject: (err: Error) => void;
        timer: NodeJS.Timeout;
    }>>();
    private _port = 0;
    private _address = "";
    private _started = false;
    private expectedInstanceId?: string;

    constructor(options?: LocalChannelServerOptions) {
        this.expectedInstanceId = options?.expectedInstanceId;
    }

    /** The bound port number (valid after start()). */
    get port(): number {
        return this._port;
    }

    /** The bound IP address string (valid after start()). */
    get address(): string {
        return this._address;
    }

    /** Whether the server is currently listening. */
    get started(): boolean {
        return this._started;
    }

    /**
     * Start listening on 127.0.0.1:0.
     *
     * @throws If the server is already started or binding fails.
     */
    async start(): Promise<void> {
        if (this._started) {
            throw new Error("LocalChannelServer already started");
        }

        this.server = net.createServer((socket) => {
            this.handleConnection(socket);
        });

        await new Promise<void>((resolve, reject) => {
            this.server!.once("error", reject);
            this.server!.listen(0, "127.0.0.1", () => {
                const addr = this.server!.address();

                if (!addr || typeof addr === "string") {
                    reject(new Error("Failed to resolve server address"));
                    return;
                }
                this._port = addr.port;
                this._address = addr.address;
                this._started = true;
                resolve();
            });
        });
    }

    /**
     * Shut down the server: reject all pending waiters, destroy all connected
     * sockets, and close the listening socket.
     */
    async close(): Promise<void> {
        // Reject all pending waiters.
        for (const [ch, list] of this.waiters) {
            for (const w of list) {
                clearTimeout(w.timer);
                w.reject(new Error(`LocalChannelServer closing; channel ${CC[ch] ?? ch} never opened`));
            }
        }
        this.waiters.clear();

        // Destroy all connected sockets.
        for (const s of this.sockets) {
            s.destroy();
        }
        this.sockets.clear();
        this.channels.clear();

        // Close the server if it was started.
        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server!.close(() => resolve());
            });
            this.server = null;
        }

        this._started = false;
    }

    /**
     * Get a socket for the given channel if it has already connected.
     *
     * @returns The socket, or `undefined` if the channel has not connected yet.
     */
    getStream(channel: CC): net.Socket | undefined {
        return this.channels.get(channel);
    }

    /**
     * Wait for a channel stream to connect, with optional timeout.
     *
     * If the channel has already connected, returns the socket immediately.
     * Otherwise returns a Promise that resolves when the channel connects or
     * rejects after `timeout` milliseconds.
     *
     * @param channel - The channel to wait for.
     * @param timeout - Timeout in milliseconds (default 5000).
     *
     * @returns A promise resolving to the connected socket.
     */
    waitForStream(channel: CC, timeout = 5000): Promise<net.Socket> {
        const existing = this.channels.get(channel);

        if (existing) return Promise.resolve(existing);

        return new Promise<net.Socket>((resolve, reject) => {
            const timer = setTimeout(() => {
                const list = this.waiters.get(channel);

                if (list) {
                    const filtered = list.filter((w) => w.timer !== timer);

                    if (filtered.length === 0) this.waiters.delete(channel);
                    else this.waiters.set(channel, filtered);
                }
                reject(
                    new Error(`Channel ${CC[channel] ?? channel} not opened within ${timeout}ms`)
                );
            }, timeout);

            const list = this.waiters.get(channel) ?? [];

            list.push({ resolve, reject, timer });
            this.waiters.set(channel, list);
        });
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private notifyWaiters(channel: CC, socket: net.Socket): void {
        const list = this.waiters.get(channel);

        if (!list) return;
        this.waiters.delete(channel);
        for (const w of list) {
            clearTimeout(w.timer);
            w.resolve(socket);
        }
    }

    /**
     * Handle an incoming TCP connection.
     *
     * Reads the 37-byte header (36-byte instance ID + 1-byte channel index),
     * validates the instance ID and channel index, and stores the socket for
     * the associated channel. Unsupported/invalid connections are destroyed
     * safely.
     */
    private handleConnection(socket: net.Socket): void {
        this.sockets.add(socket);

        socket.on("close", () => {
            this.sockets.delete(socket);
            for (const [channel, channelSocket] of this.channels) {
                if (channelSocket === socket) {
                    this.channels.delete(channel);
                }
            }
        });

        // Swallow errors to prevent crashes from EPIPE / ECONNRESET etc.
        socket.on("error", () => {
            // no-op
        });

        let headerBuffer = Buffer.alloc(0);

        const onData = (chunk: Buffer) => {
            headerBuffer = Buffer.concat([headerBuffer, chunk]);
            if (headerBuffer.length < HEADER_LEN) return;

            // ---- Parse header ----
            const id = headerBuffer.slice(0, ID_LEN).toString("utf8");
            const chDigit = headerBuffer.slice(ID_LEN, HEADER_LEN).toString("utf8");
            const parsed = parseInt(chDigit, 10);
            const tail = headerBuffer.slice(HEADER_LEN);

            // Discard reference; no longer needed.
            headerBuffer = Buffer.alloc(0);

            // ---- Validate instance ID ----
            if (this.expectedInstanceId !== undefined && id !== this.expectedInstanceId) {
                socket.destroy();
                return;
            }

            // ---- Validate channel index ----
            if (!Number.isInteger(parsed) || parsed < 0 || parsed > CC.REQUESTS) {
                socket.destroy();
                return;
            }

            const ch = parsed as CC;

            // ---- Validate channel is supported or reserved ----
            if (!SUPPORTED_CHANNELS.has(ch) && !RESERVED_CHANNELS.has(ch)) {
                socket.destroy();
                return;
            }

            // ---- Connection accepted ----
            // Remove the header parser so the consumer can attach their own
            // listener / pipe the socket.
            socket.off("data", onData);
            socket.pause();

            // Put back any trailing data that arrived in the same chunk as
            // the header so the consumer can read it.
            if (tail.length > 0) {
                socket.unshift(tail);
            }

            // Register the socket for the channel.
            this.channels.set(ch, socket);
            this.notifyWaiters(ch, socket);
        };

        socket.on("data", onData);
    }
}
