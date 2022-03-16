import { TransformApp } from "@scramjet/types";
import { DataStream } from "scramjet";

const sequence = [
    (inputStream) => {
        // example:
        const outputStream = DataStream.from(inputStream).map(async (data) => {
            // eslint-disable-next-line no-console
            console.log(data);
        });

        return outputStream;
    }
] as TransformApp<any>[];

export default sequence;
