/* eslint-disable no-console */
/* eslint-disable no-loop-func */
import { AppConfig, AppContext, Streamable } from "@scramjet/types";

import { StringStream } from "scramjet";

const rht = require("./real-hrtime.node");

const CUTOFF = 2000;

const diffs: bigint[] = [];
let minDiff = BigInt(Number.MAX_SAFE_INTEGER);
let maxDiff = BigInt(Number.MIN_SAFE_INTEGER);

const bigIntMax = (...args: bigint[]) => args.reduce((m, e) => e > m ? e : m);
const bigIntMin = (...args: bigint[]) => args.reduce((m, e) => e < m ? e : m);
//
const exp: [
    { requires: string, contentType: string},
    (this: AppContext<AppConfig, any>, input: Streamable<any>) => Promise<string>
] = [
    { requires: "delay-test", contentType: "application/x-ndjson" },
    /**
     *
     * @param input - internal stream
     * @returns - transformed stream
     */
    async function(input: Streamable<any>, timesOfExecution = 12000) {
        let h: bigint = BigInt(0);
        let diff = BigInt(0);
        let i = 1;

        await (input as StringStream)
            .while(o => {
                h = rht.bigint();
                diff = h - BigInt(o);

                if (diff < 0) {
                    this.logger.warn(`Package has been teleported in time! (${h.toString()} is less than ${BigInt(o.ts).toString()} at entry ${o.i}: ${o}) or machines time mismatch.`);
                }

                diffs.push(diff);

                return i++ < timesOfExecution;
            })
            .catch((e: any) => { console.log(e); })
            .run();

        this.logger.trace("Instance finished, total entries:", diffs.length);

        diffs.splice(0, CUTOFF);

        const sum = diffs
            .reduce(
                (a, b) => {
                    minDiff = bigIntMin(minDiff, b);
                    maxDiff = bigIntMax(maxDiff, b);

                    return b + a;
                }, BigInt(0)
            );

        return JSON.stringify({
            units: "ns",
            avg: parseInt((sum / BigInt(diffs.length)).toString(), 10),
            total: diffs.length,
            max: parseInt(maxDiff.toString(), 10),
            min: parseInt(minDiff.toString(), 10)
        });
    }
];

export default exp;
