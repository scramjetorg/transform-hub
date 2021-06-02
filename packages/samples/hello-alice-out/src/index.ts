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
    this.on("check", async (data) => {
        console.log("OVER EMIT LOOOOOG");
        this.emit(
            "ok",
            {
                uptime: Date.now(),
                asked: data
            });
    });

    this.logger.info("Sequence started");

    return fs.createReadStream(ffrom)
        .on("end", () => {
            this.logger.info("File read end");
            //this.end();
        })
        .pipe(JSONStream.parse("*"))
        .pipe(new scramjet.DataStream())
        .setOptions({ maxParallel: 1 })
        .do(() => new Promise(res => setTimeout(res, 1500)))
        .map(
            (names: Person) => {
                return `Hello ${names.name}!\n`;
            }
        )
        .do(console.log);


};

export default mod;
