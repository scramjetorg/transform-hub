/* eslint-disable no-console, no-extra-parens */
import { Streamable, TransformApp } from "@scramjet/types";
import { StringStream } from "scramjet";
import { PassThrough } from "stream";

const mod: (TransformApp | { requires: string, contentType: string})[] = [
    { requires: "names", contentType: "application/x-ndjson" },
    function(input: Streamable<any>) {
        const out = new PassThrough({ objectMode: true });

        console.log("Instance started");

        (input as StringStream)
            .map((data: any) => "Name is: " + data.name + "\n")
            .pipe(out);

        return out;
    }
];

export default mod;
