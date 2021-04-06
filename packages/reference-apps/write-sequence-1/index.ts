/* eslint-disable no-loop-func */

import { WritableApp } from "@scramjet/types";

const exp: [
    WritableApp<{c: number}, [], {x: number}>
] = [
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
