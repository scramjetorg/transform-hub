/* eslint-disable no-loop-func */
import { InertApp } from "@scramjet/types";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @param _stream - dummy input stream
 * @param count - how many items to produce
 */
export = async function(_stream, count = 5) {
    const data = this.initialState;

    console.log("~~~~~~~~~~~początek programu referencyjnego ", data);
    this.logger.log({ count });

    let x = data?.x || 0;

    this.on("test-event", () =>
        this.emit("test-event-response", "message from sequence")
    );
    console.log("~~~~~~~~~~~For AliG: ", count);
    while (++x < +count) {
        this.logger.log({ x: x });
        console.log("In while looooooooooop: ", count, x);
        await new Promise(res => setTimeout(res, 1000));
    }
} as InertApp<[], { x: number }>;
