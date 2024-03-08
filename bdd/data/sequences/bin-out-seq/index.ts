/* eslint-disable consistent-return */
/* eslint-disable no-console */
import { AppConfig, AppContext } from "@scramjet/types";
import { createReadStream } from "fs";
import { PassThrough } from "stream";
import * as crypto from "crypto";

const mod = [
    async function(this: AppContext<AppConfig, any>, _stream, filePath: string = `${__dirname}/random.bin`) {
        this.logger.info("Sequence started");

        try {
            const ps = new PassThrough({ encoding: "binary" });
            const stream = createReadStream(filePath);
            const hash = crypto.createHash("sha256");

            stream.pipe(ps);

            stream.on("data", (data) => {
                hash.update(data);
            });

            stream.on("end", () => {
                const checksum = hash.digest("hex");

                console.log(checksum);
                this.logger.info(`${filePath} checksum written to stdout: ${checksum}`);
            });

            return stream;
        } catch (e) {
            this.logger.error(e);
        }
    }
];

export default mod;
