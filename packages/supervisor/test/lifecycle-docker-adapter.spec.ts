import { LifecycleDockerAdapter } from "@scramjet/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter";

const test = require("ava");

let ldca: LifecycleDockerAdapter;

test.beforeEach(async() => {
    ldca = new LifecycleDockerAdapter();
    await ldca.init();
});

test("Initialized", (t: any) => {
    t.not(ldca, null);
});