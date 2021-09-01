import { TransformApp } from "@scramjet/types";
import { StringStream } from "scramjet";
import { PassThrough } from "stream";

// This method needs to expose a function that will be executed by the runner.
const mod: TransformApp = function (input) {
    const out = new PassThrough({ objectMode: true });

    console.log("from sequence!");

    // eslint-disable-next-line no-extra-parens
    // eslint-disable-next-line
    (input as unknown as StringStream)
        .map((data: any) => {
            console.log(data);

            return "Name is: " + data.name + "\n";
        })
        .pipe(out);

    return out;
};

export default mod;
