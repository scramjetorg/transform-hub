import { IComponent, IObjectLogger } from "@scramjet/types";

import net, { Socket } from "net";

import { isDefined, TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { TeceMux, TeceMuxChannel } from "@scramjet/verser";

type MaybeChannel = TeceMuxChannel | Socket | null;

type RunnerChannels = [
    TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel,
    TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel
];

type RunnerConnectionsInProgress = [
    MaybeChannel, MaybeChannel, MaybeChannel, MaybeChannel, MaybeChannel,
    MaybeChannel, MaybeChannel, MaybeChannel, MaybeChannel
];

type Events = {
    connect: (id: string, streams: RunnerChannels, protocol: TeceMux) => void
};

/**
 * Server for incoming connections from Runners
 */
export class SocketServer extends TypedEmitter<Events> implements IComponent {
    // TODO: probably to change to net server, to verify
    server?: net.Server;

    logger: IObjectLogger;

    private runnerConnectionsInProgress = new Map<string, RunnerConnectionsInProgress>();

    constructor(private port: number, private hostname: string) {
        super();

        this.logger = new ObjLogger(this);
    }

    async start(): Promise<void> {
        this.server = net.createServer();

        let protocol: TeceMux;

        this.server.on("connection", async (runnerConnection: net.Socket) => {
            runnerConnection.setNoDelay(true);
            runnerConnection.on("error", (err) => {
                this.logger.error("Error on connection from runner", err);
            });

            protocol = new TeceMux(runnerConnection);

            protocol.on("channel", async (channel: TeceMuxChannel) => {
                const { instanceId, channelId } =
                    await new Promise<{ instanceId: string, channelId: number }>((resolve) => {
                        channel.once("readable", () => {
                            const payload = channel.read(37).toString();
                            const instId = payload.substring(0, 36);
                            const chanId = parseInt(payload.substring(36, 37), 10);

                            resolve({
                                instanceId: instId,
                                channelId: chanId
                            });
                        });
                    });

                channel
                    .on("error", (err: any) => this.logger.error("Error on Instance in stream", instanceId, channelId, err))
                    .on("end", () => this.logger.debug(`Channel [${instanceId}:${channelId}] ended`));

                try {
                    await this.handleCommunicationChannel(instanceId, channelId, channel as unknown as Socket, protocol);
                } catch (err: any) {
                    channel.destroy();
                }
            });
        });

        return new Promise<void>((res, rej) => {
            this.server!
                .listen(this.port, this.hostname, () => {
                    this.logger.info("SocketServer on", this.server?.address());
                    res();
                })
                .on("error", rej);
        });
    }

    async handleCommunicationChannel(id: string, channel: number, connection: net.Socket, protocol: TeceMux) {
        let runner = this.runnerConnectionsInProgress.get(id);

        if (!runner) {
            runner = [null, null, null, null, null, null, null, null, null];
            this.runnerConnectionsInProgress.set(id, runner);
        }

        if (runner[channel] === null) {
            runner[channel] = connection;
        } else {
            throw new Error(`Runner(${id}) wanted to connect on already initialized channel ${channel}`);
        }

        if (runner.every(isDefined)) {
            protocol.removeAllListeners("channel");

            this.runnerConnectionsInProgress.delete(id);
            this.emit("connect", id, runner as RunnerChannels, protocol);
        }
    }

    close() {
        this.server?.close((err: any) => {
            if (err) {
                this.logger.error(err);
            }
        });
    }
}
