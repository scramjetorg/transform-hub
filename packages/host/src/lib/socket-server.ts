import { IComponent, Logger, DownstreamStreamsConfig, IObjectLogger } from "@scramjet/types";
import { getLogger } from "@scramjet/logger";
import net from "net";
import { isDefined, TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";

type MaybeSocket = net.Socket | null
type RunnerConnectionsInProgress = [
    MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket
]
type RunnerOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

type Events = {
    connect: (id: string, streams: DownstreamStreamsConfig) => void
}

/**
 * Server for incoming connections from Runners
 */
export class SocketServer extends TypedEmitter<Events> implements IComponent {
    // TODO: probably to change to net server, to verify
    server?: net.Server;
    logger: Logger;
    objLogger: IObjectLogger;

    private runnerConnectionsInProgress = new Map<string, RunnerConnectionsInProgress>()

    constructor(private port: number) {
        super();
        this.logger = getLogger(this);
        this.objLogger = new ObjLogger(this);
    }

    async start(): Promise<void> {
        this.server = net.createServer();

        this.server
            .on("connection", async (connection) => {
                this.logger.info("New incoming Runner connection to SocketServer");
                this.objLogger.info("New incoming Runner connection to SocketServer");

                connection.on("error", (err) => {
                    this.logger.error("Error on connection from runner", err);
                    this.objLogger.error("Error on connection from runner", err);
                });

                const id = await new Promise<string>((resolve) => {
                    connection.once("readable", () => {
                        resolve(connection.read(36).toString());
                    });
                });

                this.logger.info(`Connection from instance: ${id}`);
                this.objLogger.info("Connection from instance", id);

                let runner = this.runnerConnectionsInProgress.get(id);

                if (!runner) {
                    runner = [null, null, null, null, null, null, null, null];
                    this.runnerConnectionsInProgress.set(id, runner);
                }

                const channel = await new Promise<number>((resolve) => {
                    connection.once("readable", () => {
                        resolve(parseInt(connection.read(1).toString(), 10));
                    });
                });

                connection.on("error", (err) => {
                    this.logger.error(`Error on instance ${id} in stream ${channel}`, err);
                    this.objLogger.error("Error on instance in stream", id, channel, err);
                });

                this.logger.info(`Connection on channel: ${channel}`);
                this.objLogger.info("Connection on channel", channel);

                if (runner[channel] === null) {
                    runner[channel] = connection;
                } else {
                    throw new Error(`Runner(${id}) wanted to connect on already initialized channel ${channel}`);
                }

                if (runner.every(isDefined)) {
                    this.runnerConnectionsInProgress.delete(id);

                    this.emit("connect", id, runner as RunnerOpenConnections);
                }
            });

        return new Promise((res, rej) => {
            this.server!
                .listen(this.port, () => {
                    this.logger.info("Server on:", this.server?.address());
                    this.objLogger.info("SocketServer on", this.server?.address());
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
