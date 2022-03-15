import { APIRoute, STHConfiguration } from "@scramjet/types";
import { getRouter } from "@scramjet/api-server";
import { SocketServer } from "./socket-server";
import { HostBase } from "./host-base";

export class HostServerless extends HostBase {
    /**
     * The Host's API Server.
     */
    _router: APIRoute;

    /**
     * Api path prefix based on initial configuration.
     */
    _apiBase: string;

    public get api(): APIRoute {
        return this._router;
    }

    public get apiBase(): string {
        return this._apiBase;
    }

    /**
     * Initializes Host.
     * Sets used modules with provided configuration.
     *
     * @param {SocketServer} socketServer Server to listen for connections from instances.
     * @param {STHConfiguration} sthConfig Configuration.
     */
    constructor(socketServer: SocketServer, sthConfig: STHConfiguration) {
        super(socketServer, sthConfig);

        this._router = getRouter();
        this._apiBase = this.config.host.apiBase;
    }
}
