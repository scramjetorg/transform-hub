/* eslint-disable no-loop-func, no-console */

import { ReadableApp, WritableApp } from "@scramjet/types";

const exp: [ReadableApp<{a: number}, [], {x: number}>, WritableApp<{a: number}, [], {x: number}>] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    async function(_stream) {
        const data = this.initialState;

        let x = data?.x || 0;

        return async function*() {
            while (x++ < 2000) {
                yield { a: x };
                await new Promise(res => setTimeout(res, 1000));
            }
        };
    },
    /**
     *
     * @param stream - internal stream
     */
    async function(stream) {
        let x = 0;

        this.addStopHandler(() => {
            this.save({ x: x });
        });
        for await (const { a } of stream) {
            x = a;
            console.log({ x });
        }
    }
];

export default exp;
