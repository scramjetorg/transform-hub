/* eslint-disable no-loop-func */
import { InertApp } from "@scramjet/types";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @param _stream - dummy input stream
 * @param count - how many items to produce
 */
export = async function() {
    await new Promise<void>(resolve => {
        this.on("test-event", async () => {
            this.emit("test-event-response", "message from sequence");
            await new Promise(res => setTimeout(res, 1000));
            resolve();
        });
    });
} as InertApp;
