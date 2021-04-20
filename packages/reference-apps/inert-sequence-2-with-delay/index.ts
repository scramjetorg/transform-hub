/* eslint-disable no-loop-func */

import { ReadableApp, WritableApp } from "@scramjet/types";
import { DataStream } from "scramjet";

const exp: [ReadableApp<{ a: number }, [], { x: number }>, WritableApp<{ a: number }, [], { x: number }>] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    async function (_stream: any, ...args: any[]) { 
        console.log(args);       
        // let timesOfExecution: number;
        
        // if (args.length === 1) {
        //     timesOfExecution = args[0];
        // }
        const data = this.initialState;

        let x = data?.x || 0;
        
        const s: any = DataStream
            .from(
                async function* () {
                    while (++x < 1000) {
                        yield { a: x };
                    }
                }
            ).rate(100);

        return s;
    },
    /**
     *
     * @param stream - internal stream
     */
    async function (stream) {
        let x = 0;

        for await (const { a } of stream) {
            x = a;
            console.log({ x });
        }
    }
];

export default exp;
