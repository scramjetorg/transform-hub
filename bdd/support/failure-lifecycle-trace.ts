import { After } from "@cucumber/cucumber";

After(function(this: any, scenario: any) {
    if (scenario?.result?.status !== "FAILED") return;
    try {
        this.lifecycleTrace?.render(`scenario failure: ${scenario?.pickle?.name || "unknown"}`);
    } catch {
        // Lifecycle diagnostics must never replace the original scenario error.
    }
});
