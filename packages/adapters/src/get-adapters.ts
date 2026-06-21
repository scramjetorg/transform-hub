import { IAdapterAugmentation } from "@scramjet/types";
import { augment as processAugment } from "@scramjet/adapter-process";
import { augment as dockerAugment } from "@scramjet/adapter-docker";
import { augment as kubernetesAugment } from "@scramjet/adapter-kubernetes";

const augmentations: Record<string, () => IAdapterAugmentation> = {
    process: processAugment,
    docker: dockerAugment,
    kubernetes: kubernetesAugment
};

const adapters: {[id: keyof typeof augmentations]: IAdapterAugmentation} = {};

export function getValidAdapters(): string[] {
    return ["process", "docker", "kubernetes"];
}

export function getAdapter(adapter: string): IAdapterAugmentation {
    if (adapter in adapters) {
        return adapters[adapter];
    }
    if (!getValidAdapters().includes(adapter)) {
        throw new Error(`Invalid runtime adapter: ${adapter}`);
    }

    // eslint-disable-next-line import/no-dynamic-require
    adapters[adapter] = require(`@scramjet/adapter-${adapter}`).augment();

    return adapters[adapter];
}
