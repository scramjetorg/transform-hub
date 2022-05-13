/* eslint-disable no-loop-func */
import { TransformApp } from "@scramjet/types";
import { StringDecoder } from "string_decoder";
var crypto = require("crypto");
const decoder = new StringDecoder("utf-8");

export = async function(_stream: any) {
    this.logger.info("Sequence Checksum is called.");
    let out = "";

    for await (const chunk of _stream) {
        this.logger.info("Sequence Checksum received chunk: " + chunk.toString());
        out += decoder.write(chunk);
    }
    out += decoder.end();
    const hex = crypto.createHash("md5").update(out).digest("hex");

    this.logger.info("Sequence Checksum hex: " + hex);

    return hex;
} as TransformApp;

