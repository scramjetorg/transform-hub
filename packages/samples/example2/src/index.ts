import { InertApp } from "@scramjet/types";
import { DataStream } from "scramjet";


const mod: InertApp = function(input, prefix: string = "Hello, ", suffix: string = "!") {
    DataStream.from(process.stdin)
        .map(name => prefix + name + suffix
        )
        .pipe(process.stdout);

};

export default mod;
