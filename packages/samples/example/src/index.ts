import { ReadableApp } from "@scramjet/types";

const scramjet = require("scramjet");
const JSONStream = require("JSONStream");
const fs = require("fs");

interface Person {
    name: string,
    age: number,
    city: string
}

// This method needs to expose a function that will be executed by the runner.
const mod: ReadableApp = function(input, ffrom) {
    this.on("test", () => console.error("Got test event"));

    this.logger.info("Sequence started");

    return fs.createReadStream(ffrom)
        .pipe(JSONStream.parse("*"))
        .pipe(new scramjet.DataStream())
        .setOptions({ maxParallel: 1 })
        //.do(() => new Promise(res => setTimeout(res, 1500)))
        .do(
            async (names: Person) => {
                await new Promise(res => setTimeout(res, 1000));
                console.log(`Hello ${names.name}!`);
            }
        ).map(
            (names: Person) => {
                return `Hello ${names.name}! \n`;
            }
        )
        .resume()
        .on("finish", () => {
            this.logger.log("Sequence says: FINISH.");
        })
    ;
};

export default mod;
