/* eslint-disable no-loop-func */

import { ReadableApp, TransformApp } from "@scramjet/types";

const exp: [
    ReadableApp<{a: number}, [], {x: number}>,
    TransformApp<{a: number}, {b: number}, [], {x: number}>
] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    function(_stream) {
        const data = this.initialState;

        let x = data?.x || 0;

        return async function*() {
            while (++x < 5) {
                yield { a: x };
                await new Promise(res => setTimeout(res, 1000));
            }
        };
    },
    function(stream) {
        let x: number;

        this.handleStop(() => {
            this.save({ x: x });
        });
        return async function* () {
            for await (let { a } of stream) {
                yield { b: a };
                x = a;
                console.log({ x });
            }
        };
    }
];

export = exp;
