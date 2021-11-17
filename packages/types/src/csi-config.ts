/**
 * CSI configuration type.
 */
import { STHConfiguration } from "./sth-configuration";

export type CSIConfig = {
    socketPath: STHConfiguration["host"]["socketPath"]
    exitDelay: number;
}
