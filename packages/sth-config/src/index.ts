import { development } from "@scramjet/config";

export {
    development,
    getRuntimeAdapterOption,
    ConfigService,
    defaultConfig,
    applyManagerTrustBootstrap
} from "@scramjet/config";
export type { ManagerTrustBootstrapMaterial, ManagerTrustBootstrapOptions } from "@scramjet/config";

export const debug = development() && process.env.SCRAMJET_DEBUG ? (arg: string) => process.stdout.write(arg) : () => {};
