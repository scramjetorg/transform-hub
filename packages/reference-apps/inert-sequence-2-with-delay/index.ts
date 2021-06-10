/* eslint-disable no-loop-func */

import { PipeableStream, ReadableApp, WritableApp } from "@scramjet/types";
import { DataStream } from "scramjet";

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

        return DataStream.from(async function* () {
            await new Promise(res => setTimeout(res, 2000));
            while (++x <= timesOfExecution) {
                await new Promise(res => setTimeout(res, 1));
                yield { i: x };
            }
        })
            .map(
                ({ i }) => ({ i, ts: process.hrtime.bigint() })
            ) as unknown as PipeableStream<{ts: bigint}>;
    },
    /**
     *
     * @param _in - internal stream
     */
    async function(_in) {
        const stream = _in instanceof DataStream ? _in : DataStream.from(_in);
        const out = stream
            .stringify(({ ts }: { ts: bigint }) => `${process.hrtime.bigint() - ts}\n`);

        out.pipe(process.stdout);

        return out.whenEnd();
        // console.log("ABC", (out as any).graph());
    }
];

export default exp;
