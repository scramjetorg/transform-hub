import { IObjectLogger } from "@scramjet/runtime-types";
import { ObjLogger } from "@scramjet/obj-logger";
import { defer } from "@scramjet/utility";
import { Writable, Readable } from "stream";
import { k8sGetter } from "./k8s";
import http from "http";

type KubeConfig = import("@kubernetes/client-node").KubeConfig;
type V1ObjectMeta = import("@kubernetes/client-node").V1ObjectMeta;
type V1PodSpec = import("@kubernetes/client-node").V1PodSpec;
type V1Pod = import("@kubernetes/client-node").V1Pod;

const POD_STATUS_CHECK_INTERVAL_MS = 500;
const POD_STATUS_FAIL_LIMIT = 10;
const AUTH_RELOAD_COOLDOWN_MS = 5000;

let k8s: typeof import("@kubernetes/client-node");

async function initializeImports() {
    k8s = await k8sGetter();
}

class KubernetesClientAdapter {
    logger: IObjectLogger;
    name = "KubernetesClientAdapter";

    private _configPath: string;
    private _config?: KubeConfig;
    private _namespace: string;
    private _lastAuthReload: number = 0;

    constructor(configPath: string = "", namespace: string = "default") {
        this.logger = new ObjLogger(this.name);
        this._configPath = configPath;
        this._namespace = namespace;

        if (!k8s)
            throw new Error("Kubernetes client library not initialized");
    }

    private get config(): KubeConfig {
        if (!this._config) {
            throw new Error("Kubernetes API client not initialized");
        }

        return this._config;
    }

    public init() {
        const kc = new k8s.KubeConfig();

        try {
            if (this._configPath && this._configPath.length) {
                kc.loadFromFile(this._configPath);
            } else {
                kc.loadFromCluster();
            }

            this._config = kc;
        } catch (err: any) {
            this.logger.error("Unable to load kubeconfig", err);
        }
    }

    public reloadCredentials(): boolean {
        const now = Date.now();

        if (now - this._lastAuthReload < AUTH_RELOAD_COOLDOWN_MS) {
            return true;
        }

        this._lastAuthReload = now;

        const kc = new k8s.KubeConfig();

        try {
            if (this._configPath && this._configPath.length) {
                kc.loadFromFile(this._configPath);
            } else {
                kc.loadFromCluster();
            }

            this._config = kc;
            this.logger.info("Kubernetes credentials reloaded successfully");
            return true;
        } catch (err: any) {
            this.logger.error("Failed to reload kubeconfig", err);
            return false;
        }
    }

    private isAuthError(err: any): boolean {
        if (err instanceof k8s.ApiException) {
            return err.code === 401;
        }

        if (err instanceof k8s.FetchError) {
            return err.message?.includes("401") || err.message?.includes("Unauthorized");
        }

        return false;
    }

    async createPod(metadata: V1ObjectMeta, spec: V1PodSpec, retries: number = 0) {
        const result = await this.runWithRetries(retries, "Create Pod", () =>
            this.config.makeApiClient(k8s.CoreV1Api).createNamespacedPod({
                namespace: this._namespace,
                body: {
                    apiVersion: "v1",
                    kind: "Pod",
                    metadata,
                    spec
                }
            })
        );

        return result as {
            response: http.IncomingMessage;
            body: V1Pod;
        };
    }

    async deletePod(podName: string, retries: number = 0) {
        const result = await this.runWithRetries(retries, "Delete Pod", () =>
            this.config.makeApiClient(k8s.CoreV1Api).deleteNamespacedPod({
                name: podName,
                namespace: this._namespace,
                gracePeriodSeconds: 0
            })
        );

        return result as {
            response: http.IncomingMessage;
            body: V1Pod;
        };
    }

    async exec(podName: string, containerName: string, command: string | string[],
        stdout: Writable | null, stderr: Writable | null, stdin: Readable | null, retries: number = 0
    ) {
        const exec = new k8s.Exec(this.config);

        await this.runWithRetries(retries, "Exec", () =>
            exec.exec(this._namespace, podName, containerName, command, stdout, stderr, stdin, false,
                (...args) => this.logger.debug("exec status", ...args))
        );
    }

    async waitForPodStatus(podName: string, expectedStatuses: string[]): Promise<{ status: string, code?: number }> {
        let failCount = 0;

        while (true) {
            const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);

            try {
                const response = await kubeApi.readNamespacedPodStatus({
                    name: podName,
                    namespace: this._namespace
                });
                const status = response.status?.phase || "";

                const container = (response.status?.containerStatuses || []).find(c => c.name === podName);

                if (expectedStatuses.includes(status)) {
                    return {
                        status,
                        code: container?.state?.terminated?.exitCode
                    };
                }
            } catch (err: any) {
                if (this.isAuthError(err)) {
                    this.logger.warn(`Authentication error for "${podName}" pod, attempting credential reload`);
                    if (this.reloadCredentials()) {
                        continue;
                    }
                }

                if (err instanceof k8s.FetchError) {
                    this.logger.error(`Status for "${podName}" pod responded with error`, err?.message);

                    if (err.errno === "404") {
                        this.logger.error("Pod not found", podName);
                        throw Error("Pod not found");
                    }
                } else if (err instanceof k8s.ApiException) {
                    this.logger.error(`Status for "${podName}" pod responded with error`, err?.message);

                    if (err.code === 404) {
                        this.logger.error("Pod not found", podName);
                        throw Error("Pod not found");
                    }
                } else {
                    this.logger.error(`Failed to get pod status: ${podName}.`, err);
                }

                failCount++;

                if (failCount > POD_STATUS_FAIL_LIMIT) {
                    throw new Error("Reached the limit of failed pod status requests");
                }
            }

            await defer(POD_STATUS_CHECK_INTERVAL_MS);
        }
    }

    async getPodLog(podName: string): Promise<string[]> {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);
        const response = await kubeApi.readNamespacedPodLog({
            name: podName,
            namespace: this._namespace,
            follow: false,
            tailLines: 100
        });

        return [response];
    }

    async getPodTerminatedContainerReason(podName: string): Promise<string | undefined> {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);
        const response = await kubeApi.readNamespacedPod({
            name: podName,
            namespace: this._namespace
        });

        return response.status?.containerStatuses?.[0].state?.terminated?.reason;
    }

    async isPodsLimitReached(quotaName: string) {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);

        try {
            const responseBody =
                await kubeApi.readNamespacedResourceQuota({
                    name: quotaName,
                    namespace: this._namespace
                });

            if (responseBody) {
                const used = parseInt(responseBody.status?.used?.pods || "", 10) || 0;
                const hard = parseInt(responseBody.status?.hard?.pods || "", 10) || Infinity;

                this.logger.info("Pods limit quota", used, hard);

                return used >= hard;
            }
        } catch {
            this.logger.warn("Can't get quota object. ");
        }

        return false;
    }

    private async runWithRetries(retries: number, name: string, callback: any) {
        let tries = 0;
        let sleepMs = 1000;
        let success = false;
        let result: any = null;

        // this.logger.debug(`Starting: ${name}...`);

        while (!success && tries <= retries) {
            tries++;

            try {
                result = await callback();

                success = true;
            } catch (err: any) {
                if (this.isAuthError(err)) {
                    this.logger.warn(`Authentication error during "${name}", attempting credential reload`);
                    if (this.reloadCredentials()) {
                        continue;
                    }
                }

                if (err instanceof k8s.FetchError) {
                    this.logger.error(`Running "${name}" responded with error`, err?.message);
                } else {
                    this.logger.error(`Failed to run: ${name}.`, err);
                }

                await defer(sleepMs);

                sleepMs *= 2;
            }
        }

        if (!success) {
            throw new Error(`Failed to run: ${name} after ${tries} retries.`);
        }

        return result;
    }
}

export { KubernetesClientAdapter, initializeImports };
