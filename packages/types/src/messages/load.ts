import { CPMMessageCode } from "@scramjet/symbols";
import { LoadCheckStat } from "../load-check-stat";

export type LoadCheckStatMessage = { msgCode: CPMMessageCode.LOAD } & LoadCheckStat;
