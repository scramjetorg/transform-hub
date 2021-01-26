import { access, constants, createWriteStream } from "fs";
import { Transform } from "stream";
import { promisify } from "util";
import {ReadableStream, WritableApp2} from "../wrapper";

export const app: WritableApp2<number> = async function abc(
    source: ReadableStream<number>,
    {filename}: {filename?: string} = {}
) {
    const outname = filename || this.config.filename || null;
    if (!outname || typeof outname !== 'string')
        throw new this.AppError("SEQUENCE_MISCONFIGURED", "Output filename needed");
    
    try {
        await promisify(access)(`${outname}`, constants.W_OK)
            .catch(() => promisify(access)(`${outname}`, constants.O_CREAT))
    } catch {
        throw new this.AppError("SEQUENCE_MISCONFIGURED", "No access to specified fs location");
    }

    source
        .pipe(new Transform({transform(chunk: number, _dummy, cb) {
            cb(null, `${chunk}\n`);
        }}))
        .pipe(createWriteStream(outname));
};

