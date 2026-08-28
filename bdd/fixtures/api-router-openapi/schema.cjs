const { Router } = require("../../../packages/api-router/dist");

module.exports = Router.create({ basePath: "/api/v2" })
    .get("/health", { description: "Built generator fixture health route" })
    .post("/echo");
