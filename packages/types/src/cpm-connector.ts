import { STHConfiguration } from "./sth-configuration";

export type CPMConnectorOptions = {
    id: STHConfiguration["host"]["id"];
    infoFilePath: STHConfiguration["host"]["infoFilePath"];
    cpmSslCaPath?: STHConfiguration["cpmSslCaPath"];
}
