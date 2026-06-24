/**
 * Host proxy type.
 *
 * Simplified structural copy from the old types package/host-proxy.ts.
 */

import { Duplex } from "stream";

export type HostProxy = {
    onInstanceRequest(socket: Duplex): void;
    onRPCExpose(path: string, id: string): void;
};
