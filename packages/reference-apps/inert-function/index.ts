/* eslint-disable no-loop-func */
import { InertApp } from "@scramjet/types";

/**
 * An inert app that is just a function (not wrapped)
 *
 * @param _stream - dummy input stream
 */
export = async function(_stream) {
    const data = this.initialState;

    let x = data?.x || 0;

    this.handleStop(() => {
        this.save({ x });
    });

    while (x++) {
        console.log({ current: x });
        await new Promise(res => setTimeout(res, 1000));
    }
} as InertApp<[], {x: number}>;
