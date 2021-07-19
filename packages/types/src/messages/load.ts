import { RunnerMessageCode } from "@scramjet/symbols";
import { LoadCheckStat } from "../load-check-stat";

export type LoadCheckStatMessage = { msgCode:RunnerMessageCode.LOAD } & LoadCheckStat;
