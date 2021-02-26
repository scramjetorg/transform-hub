import { LifecycleDockerAdapter } from "@scramjet/supervisor/src/lib/adapters/docker/lifecycle-docker-adapter";
import { RunnerConfig } from "@scramjet/types/src/lifecycle";

const test = require("ava");

let ldca: LifecycleDockerAdapter;

test.beforeEach(async () => {
    ldca = new LifecycleDockerAdapter();
    await ldca.init();
});

test("Initialized", (t: any) => {
    t.not(ldca, null);
});

test("Run", async (t: any) => {
    const config: RunnerConfig = {
        image: "image",
        version: "",
        engines: {
            [""]:""
        }
    };

    t.is(await ldca.run(config), 0);
});
