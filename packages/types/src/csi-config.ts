/**
 * CSI configuration type.
 */
import { STHConfiguration } from "./sth-configuration";

export type CSIConfig = {
    instancesServerPort: STHConfiguration["host"]["instancesServerPort"]
    instanceAdapterExitDelay: STHConfiguration["instanceAdapterExitDelay"];
    noDocker: STHConfiguration["noDocker"]
}
