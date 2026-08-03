import net from "net";
import { CommunicationChannel as CC } from "@scramjet/symbols";

export interface FakeInstancesServer {
    port: number;
    sockets: Set<net.Socket>;
    channels: Map<number, net.Socket>;
    frames: {
        monitoring: Array<[number, unknown]>;
        raw: Map<number, Buffer>;
    };
    harnessErrors: Error[];
    awaitChannel(idx: number, timeoutMs?: number): Promise<net.Socket>;
    close(): Promise<void>;
}

const HEADER_LEN = 37;
const ID_LEN = 36;
const NEWLINE = Buffer.from("\r\n");

export async function createFakeInstancesServer(expectedInstanceId: string): Promise<FakeInstancesServer> {
    const sockets = new Set<net.Socket>();
    const channels = new Map<number, net.Socket>();
    const monitoring: Array<[number, unknown]> = [];
    const raw = new Map<number, Buffer>();
    const harnessErrors: Error[] = [];
    const waiters = new Map<number, Array<{ resolve:(s: net.Socket) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>>();

    const notifyWaiters = (idx: number, socket: net.Socket) => {
        const list = waiters.get(idx);

        if (!list) return;
        waiters.delete(idx);
        for (const w of list) {
            clearTimeout(w.timer);
            w.resolve(socket);
        }
    };

    const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.on("error", () => undefined);

        let header = Buffer.alloc(0);
        let channelIndex = -1;
        let monBuffer = Buffer.alloc(0);

        function onPayload(chunk: Buffer) {
            if (channelIndex === CC.MONITORING) {
                monBuffer = Buffer.concat([monBuffer, chunk]);

                while (monBuffer.includes(NEWLINE)) {
                    const i = monBuffer.indexOf(NEWLINE);

                    const line = monBuffer.slice(0, i).toString("utf8");

                    monBuffer = monBuffer.slice(i + NEWLINE.length);
                    if (line.length === 0) continue;
                    try {
                        const parsed = JSON.parse(line);

                        monitoring.push(parsed as [number, unknown]);
                    } catch (e) {
                        const reason = e instanceof Error ? e.message : String(e);

                        harnessErrors.push(new Error(`monitoring parse failed: ${reason}`));
                    }
                }
                return;
            }

            const prev = raw.get(channelIndex) ?? Buffer.alloc(0);

            raw.set(channelIndex, Buffer.concat([prev, chunk]));
        }

        const onData = (chunk: Buffer) => {
            if (channelIndex === -1) {
                header = Buffer.concat([header, chunk]);
                if (header.length < HEADER_LEN) return;

                const id = header.slice(0, ID_LEN).toString("utf8");
                const chDigit = header.slice(ID_LEN, HEADER_LEN).toString("utf8");
                const parsed = parseInt(chDigit, 10);

                if (id !== expectedInstanceId) {
                    harnessErrors.push(new Error(`unexpected instance id: ${id} (expected ${expectedInstanceId})`));
                    socket.destroy();
                    return;
                }
                if (!Number.isInteger(parsed)) {
                    harnessErrors.push(new Error(`invalid channel digit: ${chDigit}`));
                    socket.destroy();
                    return;
                }

                channelIndex = parsed;
                channels.set(channelIndex, socket);
                notifyWaiters(channelIndex, socket);

                const tail = header.slice(HEADER_LEN);

                header = Buffer.alloc(0);
                if (tail.length > 0) onPayload(tail);
                return;
            }

            onPayload(chunk);
        };

        socket.on("data", onData);
    });

    await new Promise<void>((res, rej) => {
        server.once("error", rej);
        server.listen(0, "127.0.0.1", () => res());
    });

    const address = server.address();

    if (!address || typeof address === "string") throw new Error("server failed to bind");

    const port = address.port;

    const awaitChannel = (idx: number, timeoutMs = 5000): Promise<net.Socket> => {
        const existing = channels.get(idx);

        if (existing) return Promise.resolve(existing);
        return new Promise<net.Socket>((resolve, reject) => {
            const timer = setTimeout(() => {
                const list = waiters.get(idx);

                if (list) {
                    const filtered = list.filter(w => w.timer !== timer);

                    if (filtered.length === 0) waiters.delete(idx);
                    else waiters.set(idx, filtered);
                }
                reject(new Error(`channel ${idx} not opened within ${timeoutMs}ms`));
            }, timeoutMs);
            const list = waiters.get(idx) ?? [];

            list.push({ resolve, reject, timer });
            waiters.set(idx, list);
        });
    };

    const close = async () => {
        for (const [idx, list] of waiters) {
            for (const w of list) {
                clearTimeout(w.timer);
                w.reject(new Error(`server closing; channel ${idx} never opened`));
            }
        }
        waiters.clear();
        for (const s of sockets) s.destroy();
        sockets.clear();
        await new Promise<void>(res => server.close(() => res()));
    };

    return {
        port,
        sockets,
        channels,
        frames: { monitoring, raw },
        harnessErrors,
        awaitChannel,
        close,
    };
}
