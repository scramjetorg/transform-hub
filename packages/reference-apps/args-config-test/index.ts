import { ReadableApp } from "@scramjet/types";
import { PassThrough } from "stream";

type Arguments = [string, number, { abc: string }, [string]]

const exp: ReadableApp<string, Arguments> = function(_stream, ...args) {
    const out = new PassThrough();

    out.write("config: ");
    out.write(JSON.stringify(this.config));
    out.write("\n");
    for (const arg of args) {
        out.write(`${typeof arg}, ${JSON.stringify(arg)}\n`);
    }

    out.end();

    return out;
};

export default exp;
