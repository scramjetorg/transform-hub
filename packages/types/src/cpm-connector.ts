import { STHConfiguration } from "./sth-configuration";

export type CPMConnectorOptions = {
    id: STHConfiguration["host"]["id"];
    infoFilePath: STHConfiguration["host"]["infoFilePath"];
    cpmSslCaPath?: STHConfiguration["cpmSslCaPath"];
    maxReconnections: STHConfiguration["cpm"]["maxReconnections"];
    reconnectionDelay: STHConfiguration["cpm"]["reconnectionDelay"];
    token?: string;
}
