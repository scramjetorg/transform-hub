/* eslint-disable no-loop-func */

import { ReadableApp, WritableApp } from "@scramjet/types";

let start: bigint;
let stop: bigint;

const exp: [ReadableApp<{ a: number }, [], { x: number }>, WritableApp<{ a: number }, [], { x: number }>] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    async function(_stream: any, ...args: any[]) {
        let timesOfExecution: number;

        if (args.length === 1) {
            timesOfExecution = args[0];
        }
        const data = this.initialState;

        let x = data?.x || 0;

        return async function* () {
            while (++x < timesOfExecution) {
                await new Promise(res => setTimeout(res, 10));

                start = process.hrtime.bigint();
                yield { a: x };
            }
        };
    },
    /**
     *
     * @param stream - internal stream
     */
    async function(stream) {
        for await (const { } of stream) {
            stop = process.hrtime.bigint();

            console.log(stop - start);
        }
    }
];

export default exp;
