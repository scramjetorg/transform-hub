import { Router } from "../../src";

export default Router.create({ basePath: "/api/v2" })
    .get("/health", { description: "Health" })
    .post("/echo");
