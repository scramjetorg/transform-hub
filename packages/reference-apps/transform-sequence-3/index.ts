/* eslint-disable no-loop-func */

import { TransformApp } from "@scramjet/types";

const exp: [
    TransformApp<{a: number}, {b: number}, [], {x: number}>,
    TransformApp<{b: number}, {c: number}, [], {x: number}>, // this writes to the same state as above
    TransformApp<{c: number}, {d: number}, [], {y: number}>, // states may differ
] = [
    function(stream) {
        const lastDone = this.initialState?.x || -Infinity;

        return async function* () {
            for await (const { a } of stream) {
                if (a < lastDone) continue;
                yield { b: a };
            }
        };
    },
    function(stream) {
        let x: number;

        this.addStopHandler(() => { if (x) this.save({ x }); });

        return async function* () {
            for await (const { b } of stream) {
                yield { c: b };
                x = b;
            }
        };
    },
    function(stream) {
        let x: number;

        this.addStopHandler(() => { this.save({ y: x }); });

        return async function* () {
            for await (const { c } of stream) {
                yield { d: c };
                x = c;
            }
        };
    }
];

export = exp;
