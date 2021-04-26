/* eslint-disable no-loop-func */

import { ReadableApp, TransformApp, WritableApp } from "@scramjet/types";
import { get } from "http";
import { StringStream } from "scramjet";
import { createGunzip } from "zlib";

const exp: [
    ReadableApp<{a: number}, [], {x: number}>,
    TransformApp<{a: number}, {b: number}, [], {x: number}>,
    WritableApp<{b: number}, [], {x: number}>
] = [
    /**
     * @param _stream - dummy input
     * @returns data
     */
    function(_stream) {
        //TODO pass as an argument
        get("https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz", response => {
            const stream = response
                .pipe(createGunzip())
                .pipe(new StringStream("utf-8"))
                .lines()
                .do((data) => console.log("data: ", data));
          
            stream.on("finish", function() {
              console.log("done");
            });
          });

        const data = this.initialState;

        let x = data?.x || 0;

        return async function*() {
            while (++x < 5) {
                yield { a: x };
                await new Promise(res => setTimeout(res, 1000));
            }
        };
    },
    (stream) => {
        return async function* () {
            for await (const { a } of stream) {
                yield { b: a };
            }
        };
    },
    /**
     *
     * @param stream - internal stream
     */
    async function(stream) {
        let x = 0;

        this.handleStop(() => {
            this.save({ x: x });
        });
        for await (const { b } of stream) {
            x = b;
            console.log({ x });
        }
    }
];

export = exp;
