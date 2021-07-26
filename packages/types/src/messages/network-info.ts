import { CPMMessageCode } from "@scramjet/symbols";
import { NetworkInfo } from "../network-info";

export type NetworkInfoMessage = { msgCode: CPMMessageCode.NETWORK_INFO } & NetworkInfo[];
