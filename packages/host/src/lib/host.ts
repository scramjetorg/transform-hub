import { AddressInfo } from "net";

import { APIExpose, APIRoute, STHConfiguration } from "@scramjet/types";
import { SocketServer } from "./socket-server";
import { HostBase } from "./host-base";

export class Host extends HostBase {
    /**
     * The Host's API Server.
     */
    _api: APIExpose;

    /**
     * Api path prefix based on initial configuration.
     */
    _apiBase: string;

    public get api(): APIRoute {
        return this._api as any as APIRoute;
    }

    public get apiBase(): string {
        return this._apiBase;
    }

    /**
     * Initializes Host.
     * Sets used modules with provided configuration.
     *
     * @param {APIExpose} apiServer Server to attach API to.
     * @param {SocketServer} socketServer Server to listen for connections from instances.
     * @param {STHConfiguration} sthConfig Configuration.
     */
    constructor(apiServer: APIExpose, socketServer: SocketServer, sthConfig: STHConfiguration) {
        super(socketServer, sthConfig);

        this._api = apiServer;
        this._apiBase = this.config.host.apiBase;

        this.logger.trace("Host initialized");
    }

    async onMain() {
        this._api.log.each(
            ({ date, method, url, status }) => this.logger.debug("Request", `date: ${new Date(date).toISOString()}, method: ${method}, url: ${url}, status: ${status}`)
        ).resume();

        this._api.server.listen(this.config.host.port, this.config.host.hostname);

        await new Promise<void>(res => {
            this._api.server.once("listening", () => {
                const serverInfo: AddressInfo = this._api.server.address() as AddressInfo;

                this.logger.info("API on", `${serverInfo?.address}:${serverInfo.port}`);

                res();
            });
        });
    }

    async onCleanup() {
        await new Promise<void>((res, _rej) => {
            this._api.server
                .once("close", () => {
                    this.logger.info("API server stopped");
                    res();
                })
                .close();
        });
    }
}
