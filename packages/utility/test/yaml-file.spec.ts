import test from "ava";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { FileBuilder } from "../src/file";

test("YamlFile round-trips nested values and arrays", t => {
    const file = FileBuilder(join(mkdtempSync(join(tmpdir(), "scramjet-yaml-")), "config.yaml"));
    const value = {
        enabled: true,
        tags: ["alpha", "beta"],
        nested: { retries: 3 }
    };

    t.teardown(() => file.remove());
    file.create();
    file.write(value);

    t.deepEqual(file.read(), value);
});
