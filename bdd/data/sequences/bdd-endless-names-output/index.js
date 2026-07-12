"use strict";

const { PassThrough } = require("stream");
const names = ["Alice", "Ada", "Aga", "Michał", "Patryk", "Rafał", "Aida", "Basia", "Natalia", "Monika", "Wojtek", "Arek"];

module.exports = async function (_stream, max = 10) {
    const output = new PassThrough({ objectMode: true });
    let count = 0;
    const interval = setInterval(() => {
        const data = { name: names[count % names.length] };
        console.log(data);
        output.write(data);
        count++;

        if (count > max) {
            clearInterval(interval);
            output.end();
        }
    }, 500);

    output.topic = "names";
    output.contentType = "application/x-ndjson";
    return output;
};
