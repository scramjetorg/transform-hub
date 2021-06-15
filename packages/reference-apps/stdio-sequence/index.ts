
const { StringStream } = require("scramjet");

/* eslint-disable no-loop-func */
/**
 * @typedef {import("@scramjet/types").InertApp InertApp
 * @typedef {import("@scramjet/types").AppContext} AppContext
 * @typedef {import("stream").Readable} Readable
 */

/**
 * An inert app that is just a function (not wrapped)
 *
 * @type {InertApp}
 * @param {Readable} _stream - dummy input stream
 */
module.exports = async function(_stream: any) {
    return StringStream
        .from(process.stdin)
        .lines("\n")
        .filter(([item]:any) => !isNaN(item))
        .do(
            async ([num, line]: any) => {
                const wrote = process[num % 2 ? "stdout" : "stderr"].write(line + "\n");

                if (!wrote)
                    await new Promise(res => process.stdout.once("drain", res));
            }
        )
        .run()
    ;
};
