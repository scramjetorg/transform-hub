/* eslint-disable no-loop-func, no-console */

import { WritableApp } from "@scramjet/types";

const exp: WritableApp<{c: number}, [], {x: number}> =
    async function(stream) {
        let x = 0;

        this.addStopHandler(() => {
            this.save({ x: x });
        });
        for await (const { c } of stream) {
            x = c;
            console.log({ x });
        }
    };

export = exp;
