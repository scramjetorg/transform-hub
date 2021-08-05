import { TransformApp } from "@scramjet/types";
import { DataStream } from "scramjet";

const app: TransformApp = (
    input,
    prefix: string = "Prefix| ",
    suffix: string = " |Suffix"
) =>
    DataStream.from(input)
        .map(name => prefix + name + suffix);

export default app;
