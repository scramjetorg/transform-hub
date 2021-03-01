// import { createReadStream, ReadStream } from "fs";
import { UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { CSHConnector } from "@scramjet/types/src/csh-client";
import { Readable } from "stream";

class CSHClient implements CSHConnector {
    getClient(): UpstreamStreamsConfig {
        throw new Error("Not implemented");
    }

    getPackage(): Readable {
        throw new Error("Not implemented");
    }
}

export { CSHClient };
