import { TransformApp } from "@scramjet/types";
import { PassThrough } from "stream";

const mod: TransformApp = async (input) => {
    const output = new PassThrough();

    console.log("----> INSTANCE <----");

    input.pipe(output);

    // output.write("OUTPUT DATA");
    // output.on("data", (chunk: any) => { console.log(chunk); });
    return output;
};

export default mod;
