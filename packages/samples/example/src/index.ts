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
const mod: InertApp = function(input, ffrom, fto) {
    this.on("test", () => console.error("Got test event"));

    return fs.createReadStream(ffrom)
        .pipe(JSONStream.parse("*"))
        .pipe(new scramjet.DataStream())
        .do(
            (names: Person) => {
                console.log(`Hello ${names.name}!`);
            }
        ).map(
            (names: Person) => {
                return `Hello ${names.name}! \n`;
            }
        )
        .pipe(fs.createWriteStream(fto));
};

export default mod;
