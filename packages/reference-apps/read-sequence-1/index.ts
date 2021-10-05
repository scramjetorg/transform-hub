/* eslint-disable no-loop-func, no-console */

import { ReadableApp } from "@scramjet/types";

const exp: [
    ReadableApp<{a: number}, [], {x: number}>
] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    function(_stream) {
        const data = this.initialState;

        let x = data?.x || 0;

        this.addStopHandler(() => {
            this.save({ x: x });
        });

        return async function*() {
            while (++x < 5) {
                yield { a: x };
                console.log({ x });
                await new Promise(res => setTimeout(res, 1000));
            }
        };
    }
];

export = exp;
