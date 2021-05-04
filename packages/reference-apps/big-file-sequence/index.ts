/* eslint-disable no-loop-func */
import { get } from "https";
import { StringStream } from "scramjet";
import { createGunzip } from "zlib";

const exp = [
    /**
     * @param _stream - input
     * @param _url - url of file to get
     * @returns data
     */
    function(_stream: any, _url: string) {
        return new Promise((resolve) => get(_url, response => {
            const stream = response
                .pipe(createGunzip())
                .pipe(new StringStream("utf-8"))
                .lines();

            resolve(stream);
        }));
    },

    async (stream: any) => {
        let letterCount = 0;

        for await (const str of stream) {
            for (let i = 0; i < str.length; i++) {
                if (str.charAt(i) === "a") {
                    letterCount += 1;
                }
            }
        }

        return letterCount.toString();
    }
];

export = exp;
