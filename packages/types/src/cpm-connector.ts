import { STHConfiguration } from "./sth-configuration";

export type CPMConnectorOptions = {
    id: STHConfiguration["host"]["id"];
    infoFilePath: STHConfiguration["host"]["infoFilePath"];
    cpmSslCaPath?: STHConfiguration["cpmSslCaPath"];
    maxReconnections: STHConfiguration["cpm"]["maxReconnections"];
    reconnectionDelay: STHConfiguration["cpm"]["reconnectionDelay"];
    apiKey?: string;
    apiVersion: string;
    hostType?: NonNullable<STHConfiguration["platform"]>["hostType"];
}
