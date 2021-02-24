import { LifecycleDockerAdapter } from "../../../dist/supervisor";
// import { LifecycleDockerAdapter } from "@scramjet/supervisor/src/lib/lifecycle-docker-adapter";
//todo run js version of LifecycleDockerAdapter
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