import { StringStream } from "scramjet";
import { InertApp } from "@scramjet/types";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param {Readable} _stream - dummy input stream
 */
module.exports = async function(_stream: any) {
    this.logger.log(0);

    process.stdin.on("close", () => {
        this.logger.log("CLOOOSE");
    });
    process.stdin.on("end", () => {
        this.logger.log("EEENDDD");
    });
    process.stdin.on("data", (chunk) => {
        this.logger.log("SEQUENCE CHUUUNK: " + chunk);
    });

    return StringStream
        .from(process.stdin)
        .lines("\n")
        .parse((str: any) => [+(str.match(/^\w+/) || []).pop(), str])
        .each((item) => this.logger.debug("item", item))
        .filter(([item]: any) => !isNaN(item))
        .do(
            async ([num, line]: any) => {
                const stream = num % 2 ? "stdout" : "stderr";
                const wrote = process[stream].write(line + "\n");

                this.logger.info("wrote", num, stream, wrote);

                if (!wrote)
                    await new Promise(res => process[stream].once("drain", res));
            }
        )
        .run()
        .then(() => {
            this.logger.log("Almost done");
            return new Promise(res => setTimeout(res, 100));
        })
    ;
} as InertApp;
