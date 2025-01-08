import { CSIController } from "./csi-controller";

export type IInstanceStore = { [key: string]: CSIController };

/**
 * Object storing Instance controllers.
 */
export const InstanceStore: IInstanceStore = {};
