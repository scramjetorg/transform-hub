import { getLogger } from "@scramjet/logger";
import {
    ExitCode,
    IComponent,
    ILifeCycleAdapterMain,
    ILifeCycleAdapterRun,
    Logger,
    MonitoringMessageData,
    SequenceConfig,
    STHConfiguration
} from "@scramjet/types";

import * as k8s from "@kubernetes/client-node";
import { defer } from "@scramjet/utility";
import path from "path";
// import { hostname } from "os";

/**
 * Adapter for running Instance by Runner executed in separate process.
 */
class KubernetesInstanceAdapter implements
ILifeCycleAdapterMain,
ILifeCycleAdapterRun,
IComponent {
    logger: Logger;
    private _k8sApi?: k8s.CoreV1Api

    private get k8sApi(): k8s.CoreV1Api {
        if (!this._k8sApi) {
            throw new Error("Kubernetes API client not initialized");
        }
        return this._k8sApi;
    }

    constructor(private config: STHConfiguration) {
        this.logger = getLogger(this);
        this.logger.log(this.config.sequencesRoot);
    }

    async init(): Promise<void> {
        // @TODO current namespace instead of kpietrzak
        this.logger.log("K8s Initts");

        await defer(1000);

        const kc = new k8s.KubeConfig();

        kc.loadFromCluster();

        // // @TODO use service accounts
        // kc.loadFromFile(path.join(__dirname, "k8s-config.yaml"));
        // kc.loadFromOptions({
        //     clusters: [{ name: "https://k8s-dev.int.scp.ovh:6443" }],
        //     // users: [user],
        //     // contexts: [{ namespace: "kpietrzak" }],
        //     // currentContext: "kpietrzak@k8s-dev.int.scp.ovh",
        // });

        this.logger.log("K8s Initts 2");

        await defer(1000);

        this._k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        // const client2 = kc.makeApiClient(k8s.NetworkingV1Api);

        // client2.createNamespacedNetworkPolicy('kpietrzak', {

        // })
        const pods = await this.k8sApi.listNamespacedPod("kpietrzak");

        this.logger.log(Object.keys(pods.body.items[0]));
    }
    async stats(msg: MonitoringMessageData): Promise<MonitoringMessageData> {
        return {
            ...msg,
        };
    }

    async run(config: SequenceConfig, instancesServerPort: number, instanceId: string): Promise<ExitCode> {
        const runnerName = "runner-123";

        const env = [
            `SEQUENCE_PATH=${path.join("/packages")}`,
            `DEVELOPMENT=${process.env.DEVELOPMENT ?? ""}`,
            `PRODUCTION=${process.env.PRODUCTION ?? ""}`,
            `INSTANCES_SERVER_PORT=${instancesServerPort}`,
            `INSTANCES_SERVER_HOST=${"sth-runner"}`,
            `INSTANCE_ID=${instanceId}`,
        ]
            .map(str => str.split("="))
            .map(([name, value]) => ({ name, value }));

        // await this.k8sApi.createNamespacedPersistentVolumeClaim("kpietrzak", {
        //     apiVersion: "v1",
        //     kind: "PersistentVolumeClaim",
        // });

        // this.k8sApi.connectPostNamespacedPodExec()
        await this.k8sApi.createNamespacedPod("kpietrzak", {
            apiVersion: "v1",
            kind: "Pod",
            metadata: {
                name: runnerName,
                labels: {
                    app: "runner"
                }
            },
            spec: {
                containers: [{
                    name: runnerName,
                    image: "repo.int.scp.ovh/runner:6",
                    env,
                    volumeMounts: [{
                        mountPath: "/packages",
                        name: "runner-volume",
                        //   subPath: app2
                    }]
                }],
                volumes: [{
                    name: "runner-volume",
                    persistentVolumeClaim: {
                        claimName: "shared-storage-runner",
                        readOnly: true
                    },

                }]
            }
        }).then((res) => res, reason => this.logger.error("then POD CREATE ERROR", reason)
        ).catch(reason => this.logger.error("POD CREATE ERROR", reason));

        return 0;
    }

    /**
     * Performs cleanup after Runner end.
     * Removes fifos used to communication with runner.
     */
    async cleanup(): Promise<void> {
        //noop
    }

    // @ts-ignore
    monitorRate(_rps: number): this {
        /** ignore */
    }

    /**
     * Forcefully stops Runner process.
     */
    async remove() {
    }
}

export { KubernetesInstanceAdapter };
