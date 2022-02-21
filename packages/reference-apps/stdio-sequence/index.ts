import { StringStream } from "scramjet";
import { InertApp } from "@scramjet/types";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param {Readable} _stream - dummy input stream
 */
module.exports = async function(_stream: any) {
    this.logger.trace("Start");

    return StringStream
        .from(process.stdin)
        .lines("\n")
        .parse((str: any) => [+(str.match(/^\w+/) || []).pop(), str])
        /// THIS IS SUPER WEIRRRRRRRDDDDD
        // .each will only print: item [ [ null, '' ] ]
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
            this.logger.trace("Almost done");
            return new Promise(res => setTimeout(res, 100));
        });
} as InertApp;
