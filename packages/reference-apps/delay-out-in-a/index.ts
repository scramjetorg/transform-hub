import { AppConfig, AppContext } from "@scramjet/types";

import { DataStream } from "scramjet";

const rht = require("./real-hrtime.node");

export default [
    /**
     * @param {AppContext} this Application context
     * @param _stream - dummy input
     * @param {number} timesOfExecution - number of times the measurement will be executed
     * @param {number} waitToStart - number of milliseconds to wait before starting the measurement
     * @returns {DataStream} data output stream
    */
    function(this: AppContext<AppConfig, any>, _stream: any, timesOfExecution = 12000, waitToStart = 20000) {
        this.logger.trace(`Testing ${timesOfExecution} samples after ${waitToStart} ms`);

        return Object.assign(
            DataStream.from(
                async function* () {
                    await new Promise(res => setTimeout(res, waitToStart));

                    let x = 0;

                    while (++x <= timesOfExecution) {
                        // eslint-disable-next-line no-loop-func
                        await new Promise(res => setTimeout(res, 10));
                        yield { i: x };
                    }

                    // eslint-disable-next-line no-console
                    console.log("Done", x);
                })
                .map(
                    () => rht.stringified() + "\n"
                )
                .on("error", (e) => { this.logger.error("ERR", e.message); }),
            { topic: "delay-test", contentType: "application/x-ndjson" }
        );
    }
];
