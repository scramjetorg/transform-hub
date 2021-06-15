/* eslint-disable no-loop-func */

import { TransformApp } from "@scramjet/types";
import { StringStream } from "scramjet";

const exp: [
    TransformApp<{a: number}, {b: number}, [], {x: number}>
] = [
    (stream) => {

        console.log("~~~~~~~~~~~~~~Sequence called!");
        const dataStr = StringStream
            .from(stream)
            .JSONParse();

        console.log("~~~~~~~~~~~~~~Sequence post-StringStream pre-return");
        return async function* () {
            console.log("~~~~~~~~~~~~~~Sequence return.");
            for await (const a of dataStr) {
                console.log("~~~~~~~~~~~~~~Sequence a:" + a);
                yield { b: +a };
            }
        };
    }
];

export = exp;
