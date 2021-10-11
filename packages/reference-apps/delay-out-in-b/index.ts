/* eslint-disable no-console */
/* eslint-disable no-loop-func */
import { AppConfig, AppContext, Streamable } from "@scramjet/types";

import { StringStream } from "scramjet";

const CUTOFF = 2000;

let diffs: { diff: bigint, i: number }[] = [];
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
    async function(input: Streamable<any>) {
        let h: bigint = BigInt(0);
        let diff = BigInt(0);

        await (input as StringStream)
            .each(o => {
                h = process.hrtime.bigint();
                diff = h - BigInt(o.ts);

                if (diff < 0) {
                    this.logger.warn(`Package has been teleported in time! (${h} is less than ${BigInt(o.ts)} at entry ${o.i}: ${o}) or machines time mismatch.`);
                }

                diffs.push({ i: o.i, diff });
            })
            .catch((e: any) => { console.log(e); })
            .run();

        this.logger.log("Instance finished, total entries:", diffs.length);

        diffs = diffs.filter(o => o.i > CUTOFF);

        const sum = diffs
            .reduce(
                (a, b) => {
                    minDiff = bigIntMin(minDiff, b.diff);
                    maxDiff = bigIntMax(maxDiff, b.diff);

                    return { diff: b.diff + a.diff };
                }, { diff: BigInt(0) }
            ).diff;

        this.logger.info(diffs);

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
