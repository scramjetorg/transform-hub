/* eslint-disable no-loop-func */
var crypto = require("crypto");
import { TransformApp } from "@scramjet/types";

export = async function(_stream: any) {

    let chunks = "";

    for await (const chunk of _stream) {
        console.log("----------------------- chunk: " + chunk);
        chunks += chunk.toString();
    }

    const hex = crypto.createHash("md5").update(chunks).digest("hex");

    return hex.toString();

} as TransformApp;

