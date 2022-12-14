import { IObjectLogger } from "@scramjet/types";
import * as k8s from "@kubernetes/client-node";
import { ObjLogger } from "@scramjet/obj-logger";
import { defer } from "@scramjet/utility";
import { Writable, Readable } from "stream";
import http from "http";
import { HttpError } from "@kubernetes/client-node";

const POD_STATUS_CHECK_INTERVAL_MS = 500;
const POD_STATUS_FAIL_LIMIT = 10;

class KubernetesClientAdapter {
    logger: IObjectLogger;
    name = "KubernetesClientAdapter";

    private _configPath: string;
    private _config?: k8s.KubeConfig;
    private _namespace: string;

    constructor(configPath: string = "", namespace: string = "default") {
        this.logger = new ObjLogger(this.name);
        this._configPath = configPath;
        this._namespace = namespace;
    }

    private get config(): k8s.KubeConfig {
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

    async createPod(metadata: k8s.V1ObjectMeta, spec: k8s.V1PodSpec, retries: number = 0) {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);

        const result = await this.runWithRetries(retries, "Create Pod", () =>
            kubeApi.createNamespacedPod(this._namespace, {
                apiVersion: "v1",
                kind: "Pod",
                metadata,
                spec
            })
        );

        return result as {
            response: http.IncomingMessage;
            body: k8s.V1Pod;
        };
    }

    async deletePod(podName: string, retries: number = 0) {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);

        const result = await this.runWithRetries(retries, "Delete Pod", () =>
            kubeApi.deleteNamespacedPod(podName, this._namespace, undefined, undefined, 0)
        );

        return result as {
            response: http.IncomingMessage;
            body: k8s.V1Pod;
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
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);

        let failCount = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const response = await kubeApi.readNamespacedPodStatus(podName, this._namespace);
                const status = response.body.status?.phase || "";

                const container = (response.body.status?.containerStatuses || []).find(c => c.name === podName);

                if (expectedStatuses.includes(status)) {
                    return {
                        status,
                        code: container?.state?.terminated?.exitCode
                    };
                }
            } catch (err: any) {
                if (err instanceof HttpError) {
                    this.logger.error(`Status for "${podName}" pod responded with error`, err?.body?.message);

                    if (err.statusCode === 404) {
                        this.logger.error("You have deleted this pod already! Try to increase runnerExitDelay in CSIController.");
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

    async getPodTerminatedContainerReason(podName: string): Promise<string | undefined> {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);
        const response = await kubeApi.readNamespacedPod(podName, this._namespace);

        return response.body.status?.containerStatuses?.[0].state?.terminated?.reason;
    }

    async getPodsLimit(quotaName: string) {
        const kubeApi = this.config.makeApiClient(k8s.CoreV1Api);

        try {
            const getQuotaPromise =
                await kubeApi.readNamespacedResourceQuota(quotaName, this._namespace);

            const responseBody = getQuotaPromise.body;

            if (responseBody) {
                const used = parseInt(responseBody.status?.used?.pods || "", 10) || 0;
                const hard = parseInt(responseBody.status?.hard?.pods || "", 10) || Infinity;

                this.logger.info("Pods limit quota", used, hard);

                return { used, hard };
            }
        } catch (e) {
            this.logger.warn("Can't get quota object. ");
        }

        return { used: 0, hard: 0 }; // quota failed - no pods!
    }

    async isPodsLimitReached(quotaName: string) {
        const { used, hard } = await this.getPodsLimit(quotaName);

        return used >= hard;
    }

    private async runWithRetries(retries: number, name: string, callback: any) {
        let tries = 0;
        let sleepMs = 1000;
        let success = false;
        let result: any = null;

        this.logger.debug(`Starting: ${name}...`);

        while (!success && tries <= retries) {
            tries++;

            try {
                result = await callback();

                success = true;
            } catch (err: any) {
                if (err instanceof HttpError) {
                    this.logger.error(`Running "${name}" responded with error`, err?.body?.message);
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

export { KubernetesClientAdapter };
