const scramjet = require("scramjet");
const JSONStream = require("JSONStream");
const fs = require("fs");

interface Persons {
    name: string,
    age: string,
    city: string
}

fs.createReadStream("./names.json") // open the file
    .pipe(JSONStream.parse("*")) // parse JSON array to object stream
    .pipe(new scramjet.DataStream()) // pipe for transformation
    .map(
        (names: Persons) => {
            console.log(`Hello ${names.name}!`);
            return `Hello ${names.name}! \n`;
        }
    )
    .pipe(fs.createWriteStream("./namesOut.txt")); // write to output