if (!process.env.SCRAMJET_API_ROUTER_MODULE) {
    throw new Error("SCRAMJET_API_ROUTER_MODULE must identify the resolver-validated compiled @scramjet/api-router module");
}

const { Router } = require(process.env.SCRAMJET_API_ROUTER_MODULE);

module.exports = Router.create({ basePath: "/api/v2" })
    .get("/health", { description: "Built generator fixture health route" })
    .post("/echo");
