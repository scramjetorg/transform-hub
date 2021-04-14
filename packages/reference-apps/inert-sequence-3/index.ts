/* eslint-disable no-loop-func */

import { ReadableApp, TransformApp, WritableApp } from "@scramjet/types";

const exp: [
    ReadableApp<{a: number}, [], {x: number}>,
    TransformApp<{a: number}, {b: number}, [], {x: number}>,
    WritableApp<{b: number}, [], {x: number}>
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
    (stream) => {
        return async function* () {
            for await (let { a } of stream) {
                yield { b: a };
            }
        };
    },
    /**
     *
     * @param stream - internal stream
     */
    async function(stream) {
        let x = 0;

        this.handleStop(() => {
            this.save({ x: x });
        });
        for await (let { b } of stream) {
            x = b;
            console.log({ x });
        }
    }
];

export = exp;
