/* eslint-disable no-loop-func */

import { TransformApp, WritableApp } from "@scramjet/types";

const exp: [
    TransformApp<{a: number}, {b: number}, [], {x: number}>,
    TransformApp<{b: number}, {c: number}, [], {x: number}>,
    WritableApp<{c: number}, [], {x: number}>
] = [
    (stream) => {
        return async function* () {
            for await (let { a } of stream) {
                yield { b: a };
            }
        };
    },
    (stream) => {
        return async function* () {
            for await (let { b } of stream) {
                yield { c: b };
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
        for await (let { c } of stream) {
            x = c;
            console.log({ x });
        }
    }
];

export = exp;
