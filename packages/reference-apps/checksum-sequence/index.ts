import { TransformApp } from "@scramjet/types";
import { PassThrough } from "stream";
// import { StringDecoder } from "string_decoder";
var crypto = require("crypto");
// const decoder = new StringDecoder("utf-8");

export = async function(_stream: any) {
    this.logger.info("Sequence Checksum is called.");
    const strings = _stream.pipe(new PassThrough({ encoding: "utf-8" }));

    this.logger.log("-----------strings: ", strings);
    let out = "";

    for await (const chunk of strings) {
        out += chunk;
        this.logger.log("------------chunk: ", chunk);
    }
    this.logger.log("-----------out: ", out);
    const hex = crypto.createHash("md5").update("").digest("hex");

    this.logger.info("Sequence Checksum hex: " + hex);
    return hex;

} as TransformApp;
