import { IComponent, Logger, DownstreamStreamsConfig, WritableStream, ReadableStream } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import * as net from "net";
import EventEmitter = require("events");
import { isDefined } from "@scramjet/utility";

type MaybeSocket = net.Socket | null
type RunnerConnectionsInProgress = [
    MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket
]
type RunnerOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

function mapRunnerConnectionToStreams(connections: RunnerOpenConnections): DownstreamStreamsConfig<true> {
    const stdin = connections[0] as WritableStream<string>;
    const stdout = connections[1] as ReadableStream<string>;
    const stderr = connections[2] as ReadableStream<string>;
    const control = connections[3] as WritableStream<string>;
    const monitor = connections[4] as ReadableStream<string>;
    const input = connections[5] as WritableStream<any>;
    const output = connections[6] as ReadableStream<any>;
    const log = connections[7] as ReadableStream<string>;

    return [
        stdin,
        stdout,
        stderr,
        control,
        monitor,
        input,
        output,
        log
    ];
}

export class SocketServer extends EventEmitter implements IComponent {
    server?: net.Server;
    logger: Logger;

    private connectedRunners = new Map<string, RunnerConnectionsInProgress>()

    constructor(private port: number) {
        super();

        this.logger = getLogger(this);
    }

    async start(): Promise<void> {
        this.server = net.createServer();

        this.server
            .on("connection", async (connection) => {
                this.logger.info("New incoming Runner connection to SocketServer");

                connection.on("error", (err) => {
                    this.logger.error("Error on connection from runner", err);
                });

                const id = await new Promise<string>((resolve) => {
                    connection.once("readable", () => {
                        resolve(connection.read(36).toString());
                    });
                });

                this.logger.info(`Connection from instance: ${id}`);

                if (!id) {
                    throw new Error("Can't read supervisor id.");
                }

                let runner = this.connectedRunners.get(id);

                if (!runner) {
                    runner = [null, null, null, null, null, null, null, null];
                    this.connectedRunners.set(id, runner);
                }

                const channel = await new Promise<number>((resolve) => {
                    connection.once("readable", () => {
                        resolve(parseInt(connection.read(1).toString(), 10));
                    });
                });

                this.logger.info(`Connection on channel: ${channel}`);

                // @TODO check it it runner[channel] was null before if not throw
                runner[channel] = connection;

                if (runner.every(isDefined)) {
                    const streams = mapRunnerConnectionToStreams(runner as RunnerOpenConnections);

                    // @TODO use typed event emitter
                    this.emit("connect", { id, streams });
                }
            });

        return new Promise((res, rej) => {
            this.server!
                .listen(this.port, () => {
                    this.logger.info("Server on:", this.server?.address());
                    res();
                })
                .on("error", rej);
        });
    }

    close() {
        this.server?.close((err) => {
            if (err) {
                this.logger.error(err);
            }
        });
    }
}
