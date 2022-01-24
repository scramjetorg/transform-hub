/* eslint-disable no-loop-func */
import { PipeableStream, ReadableApp, WritableApp } from "@scramjet/types";
import { DataStream } from "scramjet";

const exp: [ReadableApp<{ ts: bigint }, [], { x: number }>, WritableApp<{ ts: bigint }, [], { x: number }>] = [

    /**
    * @param _stream - dummy input
    * @returns data
    */

    async function(_stream: any, timesOfExecution = 4000, waitToStart = 2000, abort = 0) {
        const data = this.initialState;

        let x = data?.x || 0;

        this.logger.trace(`Testing ${timesOfExecution} samples after ${waitToStart} with abort=${abort}`);

        return DataStream.from(async function* () {
            await new Promise(res => setTimeout(res, waitToStart));
            while (++x <= timesOfExecution - (abort ? 1 : 0)) {
                await new Promise(res => setTimeout(res, 5));
                yield { i: x };
            }
            if (abort) {
                yield { i: -1 };
            }
        })
            .map(
                ({ i: scramjetTest }) => ({ scramjetTest, ts: process.hrtime.bigint() })
            ) as unknown as PipeableStream<{ts: bigint}>;
    },
    /**
     *
     * @param _in - internal stream
     */
    async function(_in) {
        let aborting = false;

        const stream = _in instanceof DataStream ? _in : DataStream.from(_in);
        const out = stream
            .assign(({ ts }) => ({ elapsed: process.hrtime.bigint() - ts }))
            .do(({ scramjetTest }: any) => scramjetTest < 0 && (aborting = true))
            .stringify(({ elapsed }: { elapsed: bigint }) => `${elapsed}\n`)
        ;

        out.pipe(process.stdout);
        await out.whenEnd();

        if (aborting) {
            this.logger.warn("Process will abort!");
            await new Promise(res => setTimeout(res, 2000));
            process.abort();
        }
    }
];

export default exp;
