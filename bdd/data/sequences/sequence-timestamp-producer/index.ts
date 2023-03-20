/* eslint-disable no-loop-func */

import { AppConfig, AppContext } from "@scramjet/types";
import { DataStream } from "scramjet";

const rht = require("./real-hrtime.node");

export default [
    /**
     * @param {AppContext} this Application context
     * @param _stream - dummy input
     * @param {number} timesOfExecution - number of times the timestamp will be sent to topic
     * @param {string} topicName - topic name to which timestamps will be sent
     * @returns {DataStream} data output stream
    */

    function(this: AppContext<AppConfig, any>, _stream: any, timesOfExecution = 2128, topicName = "timestamp") {
        this.logger.trace(`Sending ${timesOfExecution} timestamps to topic ${topicName}`);
        let x = 0;

        return Object.assign(
            DataStream.from(
                async function* () {
                    while (++x <= timesOfExecution) {
                        await new Promise(res => setTimeout(res, 10));
                        yield { i: x };
                    }
                })
                .map(
                    () => rht.stringified() + "\n"
                )
                .on("error", (e) => { this.logger.error("ERR", e.message); }),
            { topic: `${topicName}`, contentType: "application/x-ndjson" }
        );
    }
];
