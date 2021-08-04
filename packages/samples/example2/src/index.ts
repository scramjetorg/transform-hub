import { TransformApp } from "@scramjet/types";
import { DataStream } from "scramjet";


const app: TransformApp = async function(input, prefix: string = "Hello, ", suffix: string = "!") {
    return DataStream.from(input)
        .map(name => prefix + name + suffix);
};

export default app;
