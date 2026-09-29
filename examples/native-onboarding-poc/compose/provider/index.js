"use strict";

module.exports = async function provider() {
  this.api.use("/native.compose.echo", async (_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ready: true, value: "typed-compose" }));
  });
  await new Promise(() => {});
};
