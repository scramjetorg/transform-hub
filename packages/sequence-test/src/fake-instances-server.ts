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
const HOST = "127.0.0.1";

const originalCreateConnection = net.createConnection;
const originalConnect = net.connect;
const clientSocketsByPort = new Map<number, Map<number, net.Socket>>();
let isCreateConnectionPatched = false;

const getConnectionTarget = (args: unknown[]): { port?: number; host?: string } => {
    if (args.length === 0) return {};

    const first = args[0];

    if (typeof first === "number") {
        return {
            port: first,
            host: typeof args[1] === "string" ? args[1] : undefined,
        };
    }

    if (typeof first === "object" && first !== null) {
        const options = first as { port?: number; host?: string };

        return { port: options.port, host: options.host };
    }

    return {};
};

const getClientSocketMap = (port?: number) => {
    if (!port) return undefined;

    return clientSocketsByPort.get(port);
};

const createClientSocket = (...args: unknown[]): net.Socket => {
    const socket = originalCreateConnection(...(args as Parameters<typeof net.createConnection>));
    const target = getConnectionTarget(args);
    const sockets = getClientSocketMap(target.port);

    if (sockets && (!target.host || target.host === HOST || target.host === "localhost")) {
        const cache = () => {
            if (socket.localPort !== undefined) {
                sockets.set(socket.localPort, socket);
                return;
            }

            socket.once("connect", cache);
        };

        cache();

        const remove = () => {
            if (socket.localPort !== undefined) {
                sockets.delete(socket.localPort);
            }
        };

        socket.once("close", remove);
        socket.once("error", remove);
    }

    return socket;
};

const patchCreateConnection = () => {
    if (isCreateConnectionPatched) return;

    const createConnection = ((...args: unknown[]) => createClientSocket(...args)) as typeof net.createConnection;
    const connect = ((...args: unknown[]) => createClientSocket(...args)) as typeof net.connect;

    net.createConnection = createConnection;
    net.connect = connect;
    isCreateConnectionPatched = true;
};

const unpatchCreateConnection = () => {
    if (clientSocketsByPort.size > 0 || !isCreateConnectionPatched) return;

    net.createConnection = originalCreateConnection;
    net.connect = originalConnect;
    isCreateConnectionPatched = false;
};

const registerClientSocketsMap = (port: number, sockets: Map<number, net.Socket>) => {
    clientSocketsByPort.set(port, sockets);
};

const unregisterClientSocketsMap = (port: number) => {
    clientSocketsByPort.delete(port);
    unpatchCreateConnection();
};

type ConnectionWaiter = {
    resolve: (socket: net.Socket) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
};

export async function createFakeInstancesServer(expectedInstanceId: string): Promise<FakeInstancesServer> {
    const sockets = new Set<net.Socket>();
    const channels = new Map<number, net.Socket>();
    const monitoring: Array<[number, unknown]> = [];
    const raw = new Map<number, Buffer>();
    const harnessErrors: Error[] = [];
    const waiters = new Map<number, Array<ConnectionWaiter>>();
    const clientSockets = new Map<number, net.Socket>();

    const notifyWaiters = (idx: number, channelSocket: net.Socket) => {
        const list = waiters.get(idx);

        if (!list) return;

        waiters.delete(idx);
        for (const item of list) {
            clearTimeout(item.timer);
            item.resolve(channelSocket);
        }
    };

    const server = net.createServer((socket) => {
        sockets.add(socket);

        socket.on("close", () => sockets.delete(socket));

        let header = Buffer.alloc(0);
        let channelIndex = -1;
        let monitoringBuffer = Buffer.alloc(0);

        const onPayload = (chunk: Buffer) => {
            if (channelIndex === CC.MONITORING) {
                monitoringBuffer = Buffer.concat([monitoringBuffer, chunk]);

                for (;;) {
                    const sep = monitoringBuffer.indexOf(NEWLINE);

                    if (sep === -1) break;

                    const frame = monitoringBuffer.slice(0, sep).toString("utf8");

                    monitoringBuffer = monitoringBuffer.slice(sep + NEWLINE.length);

                    if (frame.length === 0) continue;

                    try {
                        const parsed = JSON.parse(frame) as [number, unknown];

                        monitoring.push(parsed);
                    } catch (error) {
                        const reason = error instanceof Error ? error.message : String(error);

                        harnessErrors.push(new Error(`monitoring parse failed: ${reason}`));
                    }
                }

                return;
            }

            const prev = raw.get(channelIndex) ?? Buffer.alloc(0);

            raw.set(channelIndex, Buffer.concat([prev, chunk]));
        };

        const onData = (chunk: Buffer) => {
            if (channelIndex === -1) {
                header = Buffer.concat([header, chunk]);

                if (header.length < HEADER_LEN) return;

                const id = header.slice(0, ID_LEN).toString("utf8");
                const channelDigit = header.slice(ID_LEN, HEADER_LEN).toString("utf8");
                const parsed = Number.parseInt(channelDigit, 10);

                if (id !== expectedInstanceId) {
                    harnessErrors.push(new Error(`unexpected instance id: ${id} (expected ${expectedInstanceId})`));
                    socket.destroy();
                    return;
                }

                if (!Number.isInteger(parsed)) {
                    harnessErrors.push(new Error(`invalid channel digit: ${channelDigit}`));
                    socket.destroy();
                    return;
                }

                channelIndex = parsed;
                channels.set(channelIndex, socket);

                const clientSocket = socket.remotePort !== undefined ? clientSockets.get(socket.remotePort) : undefined;

                notifyWaiters(channelIndex, clientSocket ?? socket);

                const tail = header.slice(HEADER_LEN);

                header = Buffer.alloc(0);

                if (tail.length > 0) {
                    onPayload(tail);
                }

                return;
            }

            onPayload(chunk);
        };

        socket.on("data", onData);
        socket.on("error", () => undefined);
    });

    await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, HOST, () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
        throw new Error("server failed to bind");
    }

    const port = address.port;

    registerClientSocketsMap(port, clientSockets);
    patchCreateConnection();

    const awaitChannel = (idx: number, timeoutMs = 5000): Promise<net.Socket> => {
        const existing = channels.get(idx);

        if (existing) {
            return Promise.resolve(
                existing.remotePort !== undefined && clientSockets.has(existing.remotePort)
                    ? clientSockets.get(existing.remotePort) ?? existing
                    : existing
            );
        }

        return new Promise<net.Socket>((resolve, reject) => {
            const timer = setTimeout(() => {
                const list = waiters.get(idx);

                if (list) {
                    const filtered = list.filter((w) => w.timer !== timer);

                    if (filtered.length === 0) {
                        waiters.delete(idx);
                    } else {
                        waiters.set(idx, filtered);
                    }
                }

                reject(new Error(`channel ${idx} not opened within ${timeoutMs}ms`));
            }, timeoutMs);

            const list = waiters.get(idx) ?? [];

            list.push({
                resolve,
                reject,
                timer,
            });
            waiters.set(idx, list);
        });
    };

    const close = async () => {
        for (const [idx, list] of waiters) {
            for (const item of list) {
                clearTimeout(item.timer);
                item.reject(new Error(`server closing; channel ${idx} never opened`));
            }
        }
        waiters.clear();

        for (const socket of sockets) {
            socket.destroy();
        }
        sockets.clear();

        channels.clear();
        raw.clear();
        monitoring.length = 0;
        clientSockets.clear();

        unregisterClientSocketsMap(port);

        await new Promise<void>((resolve, reject) => {
            server.close((error?: Error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    };

    return {
        port,
        sockets,
        channels,
        frames: {
            monitoring,
            raw,
        },
        harnessErrors,
        awaitChannel,
        close,
    };
}
