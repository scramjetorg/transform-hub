/* eslint-disable no-loop-func */

import { TransformApp } from "@scramjet/types";

const exp: TransformApp<{a: number}, {b: number}, [], {x: number}> =
    (stream) => {
        return async function* () {
            for await (let { a } of stream) {
                yield { b: a };
            }
        };
    };

export = exp;
