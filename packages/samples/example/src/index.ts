import { InertApp } from "@scramjet/types";

const scramjet = require("scramjet");
const JSONStream = require("JSONStream");
const fs = require("fs");

interface Person {
    name: string,
    age: number,
    city: string
}

// This method needs to expose a function that will be executed by the runner.
const mod: InertApp = function(input, ffrom) {
    this.on("test", () => console.error("Got test event"));

    this.logger.info("Sequence started");

    return new Promise((resolve) => {
        fs.createReadStream(ffrom)
            .pipe(JSONStream.parse("*"))
            .pipe(new scramjet.DataStream())
            .setOptions({ maxParallel: 1 })
            //.do(() => new Promise(res => setTimeout(res, 1500)))
            .do(
                (names: Person) => {
                    console.log(`Hello ${names.name}!`);
                }
            ).map(
                (names: Person) => {
                    return `Hello ${names.name}! \n`;
                }
            ).on("finish", () => {
                this.logger.log("Sequence says: FINISH.");
                resolve();
            });
    });

};

export default mod;
