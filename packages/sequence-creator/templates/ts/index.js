"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scramjet_1 = require("scramjet");
const sequence = [
    (inputStream) => {
        const outputStream = scramjet_1.DataStream.from(inputStream).map(async (data) => {
            console.log(data);
        });
        return outputStream;
    }
];
exports.default = sequence;
//# sourceMappingURL=index.js.map