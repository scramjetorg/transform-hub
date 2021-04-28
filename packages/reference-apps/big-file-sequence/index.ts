/* eslint-disable no-loop-func */
import { get } from "https";
import { StringStream } from "scramjet";
import { createGunzip } from "zlib";

const exp = [
    /**
     * @param _stream - dummy input
     * @param url - url of file to get
     * @returns data
     */
    function(_stream: any, url: string) {
        //https://repo.int.scp.ovh/repository/scp-store/small-file.json.gz
        console.log("--------sequence url TODELETE: ", url);

        return new Promise((resolve) => get(url, response => {
            const stream = response
                .pipe(createGunzip())
                .pipe(new StringStream("utf-8"))
                .lines();

            resolve(stream);
            stream.on("finish", function() {
                console.log("done");
            });
        }));
    },

    async function(stream: any) {
        // for await (const y of stream) {
        //     console.log(y);
        // }
        return stream;
    }
];

export = exp;
