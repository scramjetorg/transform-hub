/* eslint-disable no-loop-func */

import { ReadableApp, WritableApp } from "@scramjet/types";

const exp: [ReadableApp<{ ts: bigint }, [], { x: number }>, WritableApp<{ ts: bigint }, [], { x: number }>] = [

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

                const ts = process.hrtime.bigint();

                yield { ts };
            }
        };
    },
    /**
     *
     * @param stream - internal stream
     */
    async function(stream) {
        for await (const { ts } of stream) {
            const stop = process.hrtime.bigint();

            console.log(stop - ts);
        }
    }
];

export default exp;
