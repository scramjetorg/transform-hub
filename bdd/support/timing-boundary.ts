/**
 * Register after the step definitions so this After hook runs first.  The
 * resulting interval covers every feature After hook and the final world /
 * ScenarioLifecycle cleanup hook, including failed-Before and no-step cases.
 */
import { After } from "@cucumber/cucumber";
import { beginCleanupTiming } from "./memory-hooks";

After(function (this: any) {
    if (process.env.SCRAMJET_BDD_MEMLAB === "1") {
        (globalThis as any).__scramjetBddMemlabCapture?.("target");
    }
    beginCleanupTiming(this);
});
