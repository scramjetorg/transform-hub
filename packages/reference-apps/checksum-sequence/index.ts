/* eslint-disable no-loop-func */
import { TransformApp } from "@scramjet/types";
import { StringDecoder } from "string_decoder";
var crypto = require("crypto");
const decoder = new StringDecoder("utf-8");

export = async function(_stream: any) {

    let out = "";

    for await (const chunk of _stream) {
        if (chunk.toString() === "null") {
            break;
        }
        out += decoder.write(chunk);
    }
    out += decoder.end();

    const hex = crypto.createHash("md5").update(out).digest("hex");

    return hex;

} as TransformApp;

