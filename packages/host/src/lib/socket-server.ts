import { IComponent, IObjectLogger } from "@scramjet/types";

import net from "net";

import { isDefined, TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { TeceMux, TeceMuxChannel } from "@scramjet/verser";

type MaybeChannel = TeceMuxChannel | null;

type RunnerChannels = [
    TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel,
    TeceMuxChannel, TeceMuxChannel, TeceMuxChannel, TeceMuxChannel
];

type RunnerConnectionsInProgress = [
    MaybeChannel, MaybeChannel, MaybeChannel, MaybeChannel, MaybeChannel,
    MaybeChannel, MaybeChannel, MaybeChannel, MaybeChannel
];

type Events = {
    connect: (id: string, streams: RunnerChannels) => void
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

                this.logger.info("new channel", instanceId, channelId, channel._id);

                let runner = this.runnerConnectionsInProgress.get(instanceId);

                if (!runner) {
                    runner = [null, null, null, null, null, null, null, null, null];
                    this.runnerConnectionsInProgress.set(instanceId, runner);
                }

                channel
                    .on("error", (err: any) => this.logger.error("Error on Instance in stream", instanceId, channelId, err))
                    .on("end", () => this.logger.debug(`Channel [${instanceId}:${channelId}] ended`));

                if (runner[channelId] === null) {
                    runner[channelId] = channel;
                } else {
                    throw new Error(`Runner(${instanceId}) wanted to connect on already initialized channel ${channelId}`);
                }

                if (runner.every(isDefined)) {
                    this.runnerConnectionsInProgress.delete(instanceId);
                    this.emit("connect", instanceId, runner as RunnerChannels);
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

    close() {
        this.server?.close((err: any) => {
            if (err) {
                this.logger.error(err);
            }
        });
    }
}
