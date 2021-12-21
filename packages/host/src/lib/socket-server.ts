import { IComponent, Logger, DownstreamStreamsConfig } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import * as net from "net";
import EventEmitter = require("events");
import { isDefined } from "@scramjet/utility";
import { PassThrough } from "stream";
import { CommunicationChannel } from "@scramjet/symbols";
import { HostError } from "@scramjet/model";

type MaybeSocket = net.Socket | null
type RunnerConnectionsInProgress = [
    MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket
]
type RunnerOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

// eslint-disable-next-line complexity
function handleStream(streams: PassThrough[], stream: net.Socket, channel: number): void {
    switch (channel) {
    case CommunicationChannel.STDIN:
    case CommunicationChannel.IN:
    case CommunicationChannel.CONTROL:
        streams[channel].pipe(stream);
        break;
    case CommunicationChannel.STDOUT:
    case CommunicationChannel.STDERR:
    case CommunicationChannel.MONITORING:
    case CommunicationChannel.LOG:
    case CommunicationChannel.OUT:
        stream.pipe(streams[channel]);
        break;
    case CommunicationChannel.PACKAGE:
        streams[channel]?.pipe(stream);
        break;
    default:
        throw new HostError("UNKNOWN_CHANNEL");
    }
}

function mapRunnerConnectionToStreams(
    connections: RunnerOpenConnections, logger: Logger
): DownstreamStreamsConfig<true> {
    const streams = Array.from(Array(8)).map(() => new PassThrough().on("error", (err) => {
        logger.error(err);
    }));

    connections.forEach((conn, channel) => handleStream(streams, conn, channel));

    // @TODO type it better
    return streams as unknown as DownstreamStreamsConfig<true>;
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

                connection.on("error", (err) => {
                    this.logger.error(`Error on instance ${id} in stream ${channel}`, err);
                });

                this.logger.info(`Connection on channel: ${channel}`);

                // @TODO check it it runner[channel] was null before if not throw
                runner[channel] = connection;

                if (runner.every(isDefined)) {
                    const streams = mapRunnerConnectionToStreams(runner as RunnerOpenConnections, this.logger);

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
