import { LifecycleDockerAdapter } from "@scramjet/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter";

const test = require("ava");

let ldca: LifecycleDockerAdapter;

test.beforeEach(() => {
    ldca = new LifecycleDockerAdapter();
});

test("Initialized", (t: any) => {
    t.not(ldca, null);
    t.not(ldca.runnerConfig, null);
    t.not(ldca.prerunnerConfig, null);
});