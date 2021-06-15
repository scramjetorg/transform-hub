/* eslint-disable no-loop-func */

import { TransformApp } from "@scramjet/types";

const exp: [
    TransformApp<{abc: number}, {b: {abc: number}}, [], {x: number}>
] = [
    (stream) => {
        return async function* () {
            for await (const a of stream) {
                console.log("~~~~~~~~~~~~~~Sequence a:", a);
            //    yield { b: a };
            }
        };
    }
];

export = exp;
