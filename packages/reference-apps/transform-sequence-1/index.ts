/* eslint-disable no-loop-func */

import { TransformApp } from "@scramjet/types";

const exp: [
    TransformApp<{abc: number}, {b: {abc: number}}, [], {x: number}>
] = [
    (stream) => {
        return async function* () {
            console.log("Sequence returning generator.");
            for await (const a of stream) {
                console.log("Sequence loop on stream. Value of chunk is " + a.toString());
                yield { b: a };
            }
        };
    }
];

export = exp;
