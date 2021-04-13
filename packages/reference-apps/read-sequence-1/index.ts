/* eslint-disable no-loop-func */

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

        this.handleStop(() => {
            this.save({ x: x });
        });

        return async function*() {
            while (++x) {
                yield { a: x };
                await new Promise(res => setTimeout(res, 1000));
            }
        };
    }
];

export = exp;
