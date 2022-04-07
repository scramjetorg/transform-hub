/* eslint-disable no-loop-func */

import { TransformApp } from "@scramjet/types";

const exp: TransformApp<{a: number}, {b: number}, [], {x: number}> =
    function(stream) {
        const logger = this.logger;
        const tsStart = Date.now();

        this.logger.info("Simple transform function started");

        return async function* () {
            let i = 0;

            for await (const { a } of stream) {
                yield { millis: Date.now() - tsStart, b: a };
                if (!(++i % 100)) {
                    logger.debug(`Parsed ${i / 100}00 items`);
                }
            }
        };
    };

export = exp;
