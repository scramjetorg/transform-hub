"use strict";

module.exports = async function () {
    await new Promise(resolve => {
        this.on("test-event", async () => {
            await new Promise(res => setTimeout(res, 3000));
            this.emit("test-event-response", "message from sequence");
            await new Promise(res => setTimeout(res, 1000));
            resolve();
        });
    });
};
