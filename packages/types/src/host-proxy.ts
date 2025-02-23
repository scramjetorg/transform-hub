import { Duplex } from "stream";

export type HostProxy = {
    onInstanceRequest(socket: Duplex): void;
    onRPCExpose(path: string, id: string): void;
}
