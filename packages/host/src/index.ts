import { APIExpose } from "@scramjet/types";
import { CSIController } from "./lib/csi-controller";
import { SocketServer } from "./lib/socket-server";

export class Host {
    apiServer: APIExpose;
    socketServer: SocketServer;

    csiControllers: { [key : string]: CSIController } = {}

    private attachListeners() {
        this.socketServer.on("connect", ({ id, streams }) => {
            this.csiControllers[id].handleSupervisorConnect(streams);
        });
    }

    constructor(apiServer: APIExpose, socketServer: SocketServer) {
        this.apiServer = apiServer;
        this.socketServer = socketServer;
    }

    main() {
        this.attachListeners();
    }
}
