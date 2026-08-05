import test from "ava";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { c, x } from "tar";
import { KubernetesInstanceAdapter } from "../src/kubernetes-instance-adapter";

test("loads the Kubernetes API host from kubeconfig YAML", t => {
    const root = mkdtempSync(join(tmpdir(), "scramjet-kubeconfig-"));
    const authConfigPath = join(root, "config.yaml");

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(authConfigPath, "clusters:\n  - cluster:\n      server: https://localhost:6443\n");

    const adapter = new KubernetesInstanceAdapter({
        adapters: {
            kubernetes: {
                authConfigPath,
                namespace: "default",
                sthPodHost: ":auto",
                runnerImages: { node: "runner-node", python3: "runner-python", bun: "runner-bun" },
                sequencesRoot: root
            }
        }
    } as any);

    t.is((adapter as any).sthHost, "localhost");
});

test("extracts a gzip archive using the adapter tar API", async t => {
    const root = mkdtempSync(join(tmpdir(), "scramjet-kubernetes-tar-"));
    const source = join(root, "source");
    const destination = join(root, "destination");
    const archive = join(root, "sequence.tar.gz");

    t.teardown(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(source);
    mkdirSync(destination);
    writeFileSync(join(source, "package.json"), JSON.stringify({ name: "sequence" }));

    await c({ cwd: source, file: archive, gzip: true }, ["package.json"]);
    await x({ cwd: destination, file: archive });

    t.deepEqual(JSON.parse(readFileSync(join(destination, "package.json"), "utf8")), { name: "sequence" });
});
