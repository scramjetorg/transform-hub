/* eslint-disable no-loop-func */

import { ReadableApp, TransformApp } from "@scramjet/types";

const exp: [
    ReadableApp<{a: number}, [], {x: number}>,
    TransformApp<{a: number}, {b: number}, [], {x: number}>,
    TransformApp<{b: number}, {c: number}, [], {x: number}>,
] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    function(_stream) {
        const data = this.initialState;

        let x = data?.x || 0;

        return async function*() {
            while (x++) {
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
    function(stream) {
        let x: number;

        this.handleStop(() => {
            this.save({ x: x });
        });
        return async function* () {
            for await (let { b } of stream) {
                x = b;
                yield { c: b };
            }
        };
    }
];

export = exp;
