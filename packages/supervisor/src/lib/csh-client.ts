import { createReadStream } from "fs";
import { UpstreamStreamsConfig } from "@scramjet/types/src/message-streams";
import { CSHConnector } from "@scramjet/types/src/csh-client";
import { Readable } from "stream";

class CSHClient implements CSHConnector {
    PATH = process.env.FILE_PATH || "";

    getClient(): UpstreamStreamsConfig {
        throw new Error("Not implemented");
    }

    /**
     * fs.createReadStream
     */
    getPackage(path = this.PATH): Readable {
        const stream = createReadStream(path);
        return stream;
    }
}

export { CSHClient };
