import { After, AfterStep, Given, Then, When } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { CustomWorld } from "../world";
import { closeManifestHost, startManifestHost } from "../../lib/runtime-manifest-host";
import { runNodePythonManifestProof } from "../../lib/runtime-manifest-node-python";
import { runPythonNodeManifestProof } from "../../lib/runtime-manifest-python-node";
import { runBunManifestProof } from "../../lib/runtime-manifest-bun";
import { formatRuntimeManifestTimeout } from "../../lib/runtime-manifest-timeout";

type RuntimeManifestWorld = CustomWorld & {
    resources: CustomWorld["resources"] & {
        runtimeManifestAudit?: { close: () => Promise<void> };
        runtimeManifestProofCleanup?: () => Promise<void> | void;
        runtimeManifestProofComplete?: boolean;
        runtimeManifestPendingCheckpoint?: { checkpoint?: unknown; startedAt?: unknown; eventName?: unknown; instanceId?: unknown; sequenceId?: unknown };
        runtimeManifestTimeoutReported?: boolean;
        runtimeManifestTimeoutException?: unknown;
        runtimeManifestCleanupStarted?: boolean;
    };
};

function cucumberTimeout(exception: unknown, fallbackMessage?: unknown): { exception: unknown; stepLimitMs?: number } | undefined {
    let message: string | undefined;
    if (exception instanceof Error) message = exception.message;
    else if (typeof exception === "string") message = exception;
    else if (exception && typeof exception === "object" && typeof (exception as { message?: unknown }).message === "string") {
        message = (exception as { message: string }).message;
    } else if (exception === undefined && typeof fallbackMessage === "string") {
        message = fallbackMessage;
    }
    if (!message) return undefined;
    const match = message.match(/function timed out, ensure the (?:promise resolves|callback is executed) within (\d+) milliseconds/i);
    return match ? { exception, stepLimitMs: Number(match[1]) } : undefined;
}

async function reportTimeout(this: RuntimeManifestWorld, exception: unknown, cleanupBegun: boolean, fallbackMessage?: unknown): Promise<void> {
    if (this.resources.runtimeManifestTimeoutReported) return;
    const timeout = cucumberTimeout(exception, fallbackMessage);
    if (!timeout) return;
    const report = formatRuntimeManifestTimeout(this.resources.runtimeManifestPendingCheckpoint, {
        nowMs: Date.now(),
        ...(timeout.stepLimitMs === undefined ? {} : { stepLimitMs: timeout.stepLimitMs }),
        cleanupBegun
    });
    if (!report) return;

    this.resources.runtimeManifestTimeoutReported = true;
    this.resources.runtimeManifestTimeoutException = timeout.exception;
    process.stderr.write(`[runtime-manifest.timeout] ${report.message}\n`);
    try { await this.attach(JSON.stringify(report.attachment), "application/json"); } catch (error) {
        process.stderr.write(`[runtime-manifest.timeout] attachment failed (${error instanceof Error ? error.constructor.name : typeof error})\n`);
    }
    try { this.log("[runtime-manifest.timeout] Sanitized timeout details are attached."); } catch (error) {
        process.stderr.write(`[runtime-manifest.timeout] Cucumber log failed (${error instanceof Error ? error.constructor.name : typeof error})\n`);
    }
}

AfterStep({ tags: "@runtime-manifest" }, async function(this: RuntimeManifestWorld, step: any) {
    const result = step?.result;
    const exception = result?.exception;
    if (!cucumberTimeout(exception, exception === undefined ? result?.message : undefined)) return;
    await reportTimeout.call(this, exception, Boolean(this.resources.runtimeManifestCleanupStarted), exception === undefined ? result?.message : undefined);
});

After({ tags: "@runtime-manifest" }, async function(this: RuntimeManifestWorld, scenario: any) {
    this.resources.runtimeManifestCleanupStarted = true;
    const exception = this.resources.runtimeManifestTimeoutException ?? scenario?.result?.exception;
    const fallbackMessage = exception === undefined ? scenario?.result?.message : undefined;
    await reportTimeout.call(this, exception, true, fallbackMessage);
    const errors: Error[] = [];
    const attempt = async (cleanup: () => Promise<void> | void) => {
        try {
            await cleanup();
        } catch (error) {
            errors.push(error instanceof Error ? error : new Error(String(error)));
        }
    };

    const audit = this.resources.runtimeManifestAudit;
    if (audit) await attempt(() => audit.close());
    const proofCleanup = this.resources.runtimeManifestProofCleanup;
    if (proofCleanup) await attempt(proofCleanup);
    await attempt(() => closeManifestHost(this));

    delete this.resources.runtimeManifestAudit;
    delete this.resources.runtimeManifestProofCleanup;
    delete this.resources.runtimeManifestHost;
    delete this.resources.runtimeManifestProofComplete;

    if (errors.length) throw new Error(`Runtime-manifest scenario cleanup failed: ${errors.map(error => error.message).join("; ")}`);
});

Given(/^an isolated (source|built) runtime-manifest Host$/, async function(this: RuntimeManifestWorld, mode: "source" | "built") {
    await startManifestHost(this, mode);
    this.resources.runtimeManifestProofComplete = false;
});

When("the hosted Node producers and Python consumer prove instance-owned manifests", async function(this: RuntimeManifestWorld) {
    await runNodePythonManifestProof(this);
});

When("the hosted Python producer and Node consumer prove manifest update and rejection", async function(this: RuntimeManifestWorld) {
    await runPythonNodeManifestProof(this);
});

When("the hosted Bun-selected fixtures prove delegated manifest retrieval", async function(this: RuntimeManifestWorld) {
    await runBunManifestProof(this);
});

Then("the runtime-manifest proof is complete", function(this: RuntimeManifestWorld) {
    assert.equal(this.resources.runtimeManifestProofComplete, true, "Runtime-manifest scenario assertions did not mark the proof complete");
});
