import { Duplex } from "stream";

export type HostProxy = {
    onInstanceRequest(socket: Duplex): void;
}
