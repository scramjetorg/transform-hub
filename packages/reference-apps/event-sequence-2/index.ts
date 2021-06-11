/* eslint-disable no-loop-func */

import { ReadableApp, WritableApp } from "@scramjet/types";

const exp: [ReadableApp<{a: number}, [], {x: number}>, WritableApp<{a: number}, [], {x: number}>] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    async function(_stream) {
        const data = this.initialState;

        let x = data?.x || 0;

        this.on("new-test-event", () =>
            console.log("-event sent and received-")
        );

        return async function* () {
            while (++x < 10) {
                await new Promise(res => setTimeout(res, 1000));

                yield { a: x };
            }
        };
    },
    /**
     *
     * @param stream - internal stream
     */
    async function(stream) {
        let x = 0;

        setTimeout(() => {
            this.emit("new-test-event", "event sent between functions in one sequence");
        }, 2000);

        for await (const { a } of stream) {
            x = a;
            console.log({ x });
        }
    }
];

export default exp;
