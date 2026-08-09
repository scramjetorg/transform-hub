import { STHConfiguration } from "./sth-configuration";

export type CPMConnectorOptions = {
    id: STHConfiguration["host"]["id"];
    description: STHConfiguration["description"];
    tags: STHConfiguration["tags"];
    infoFilePath: STHConfiguration["host"]["infoFilePath"];
    maxReconnections: STHConfiguration["cpm"]["maxReconnections"];
    reconnectionDelay: STHConfiguration["cpm"]["reconnectionDelay"];
    apiKey?: string;
    apiVersion: string;
    hostType?: NonNullable<STHConfiguration["platform"]>["hostType"];
    verser2: STHConfiguration["verser2"];
}
