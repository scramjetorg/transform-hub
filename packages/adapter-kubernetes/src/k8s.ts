import { loadModule } from "@scramjet/module-loader";

export async function k8sGetter(): Promise<typeof import("@kubernetes/client-node")> {
    return loadModule<typeof import("@kubernetes/client-node")>({ mode: "import", name: "@kubernetes/client-node" });
}
