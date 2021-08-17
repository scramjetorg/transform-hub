/* eslint-disable no-loop-func */
import { TransformApp } from "@scramjet/types";
// import { StringDecoder } from "string_decoder";
import * as crypto from "crypto";
import { readFileSync } from "fs";
// const decoder = new StringDecoder("utf-8");

export = async function(_stream: any, ffrom = `${__dirname}/data.json`) {
    this.logger.info("Sequence Checksum is called.");

    const jsonToString = readFileSync(ffrom).toString();
    const newData = JSON.stringify(jsonToString);
    const hex = crypto.createHash("md5").update(newData).digest("hex");

    this.logger.info("Sequence Checksum hex: " + hex);
    return hex;

} as TransformApp;

// export = async function(_stream: any) {

//     this.logger.info("Sequence Checksum is called.");
//     let out = "";

//     for await (const chunk of _stream) {
//         this.logger.info("Sequence Checksum received chunk: " + chunk.toString());
//         out += decoder.write(chunk).toString();
//         this.logger.info("--------OUTinLOOP: ", out);
//     }
//     out += decoder.end();
//     const hex = crypto.createHash("md5").update(out).digest("hex");

//     this.logger.info("-----------Sequence Checksum hex: " + hex);
//     return hex;

// } as TransformApp;
