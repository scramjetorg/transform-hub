import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { Duplex } from "stream";
import { PythonSpawnOptions, RuntimeExecutor, RuntimeProcessHandles } from "@scramjet/runtime-types";

/**
 * Exact stdio layout for the runner-python child - same 6-slot layout as the Node runner.
 *
 * Slots:
 *   fd0 stdin  - "pipe"
 *   fd1 stdout - "pipe"
 *   fd2 stderr - "pipe"
 *   fd3 ipc    - reserved so the child gets its IPC send function; never written
 *                from the parent as a raw byte channel.
 *   fd4 pipe   - control (raw duplex byte pipe)
 *   fd5 pipe   - monitoring (raw duplex byte pipe)
 *
 * No REQUESTS channel (fd6) is opened on the Python path.
 */
export const RUNNER_PYTHON_STDIO = ["pipe", "pipe", "pipe", "ipc", "pipe", "pipe"] as const;

export type RunnerPythonStdio = typeof RUNNER_PYTHON_STDIO;

/**
 * Attempt to resolve the installed @scramjet/runner-python package root
 * via Node module resolution, falling back to local source paths for
 * development (monorepo) environments.
 *
 * Returns the package root directory path, or null if neither is found.
 */
function resolveRunnerPythonRoot(): string | null {
    // 1. Installed package (production): require.resolve finds package.json
    try {
        const pkgJsonPath = require.resolve("@scramjet/runner-python/package.json");
        return dirname(pkgJsonPath);
    } catch {
        // not installed — fall through to local paths
    }

    // 2. Local monorepo source paths (development)
    const localCandidates = [
        resolve(__dirname, "../../../runner-python"),
        resolve(__dirname, "../../runner-python"),
        resolve(__dirname, "../../../packages/runner-python"),
    ];

    for (const candidate of localCandidates) {
        if (existsSync(candidate)) return candidate;
    }

    return null;
}

/**
 * Build the PYTHONPATH for the runner-python child process.
 *
 * Production layout (installed npm package):
 *   <pkg_root>/dist/src             — real runner_python source package
 *   <pkg_root>/dist/__pypackages__  — vendored pip dependencies
 *
 * Local layout (monorepo development):
 *   <pkg_root>/src                  — real runner_python source package
 *   <pkg_root>/__pypackages__       — vendored pip dependencies (installed via install-deps.sh --target __pypackages__)
 *   <pkg_root>/dist/__pypackages__  — vendored pip dependencies (built via install-deps.sh --target dist/__pypackages__)
 */
function buildPythonPath(existing?: string): string {
    const root = resolveRunnerPythonRoot();
    const candidates: string[] = [];

    if (root) {
        // Production layout (installed package — prepack puts everything under dist/)
        const prodSrc = resolve(root, "dist/src");
        const prodVendor = resolve(root, "dist/__pypackages__");
        if (existsSync(prodSrc)) candidates.push(prodSrc);
        if (existsSync(prodVendor)) candidates.push(prodVendor);

        // Local layout (monorepo development)
        const localSrc = resolve(root, "src");
        const localVendor = resolve(root, "__pypackages__");
        const localDistVendor = resolve(root, "dist/__pypackages__");
        if (existsSync(localSrc)) candidates.push(localSrc);
        if (existsSync(localVendor)) candidates.push(localVendor);
        if (existsSync(localDistVendor) && !candidates.includes(localDistVendor)) {
            candidates.push(localDistVendor);
        }
    }

    // Legacy fallback paths for monorepo transitive resolution
    const legacyCandidates = [
        resolve(__dirname, "../../../runner-python/dist/__pypackages__"),
        resolve(__dirname, "../../runner-python/dist/__pypackages__"),
        resolve(__dirname, "../../../packages/runner-python/__pypackages__"),
        resolve(__dirname, "../../../dist/runner-python/__pypackages__"),
    ].filter(existsSync);
    for (const p of legacyCandidates) {
        if (!candidates.includes(p)) candidates.push(p);
    }

    if (existing) candidates.push(existing);

    return candidates.join(":");
}

/**
 * Spawn a runner-python child process.
 *
 * Production form: `python3 -m runner_python <bootConfigPath>`
 * Test override:   `python3 <runtimeEntry> <bootConfigPath>` (used when
 * `opts.runtimeEntry` is a non-empty string pointing at a .py file).
 *
 * In both forms `bootConfigPath` arrives at `sys.argv[1]` in the child.
 *
 * Runner-owned env vars (SEQUENCE_PATH, SEQUENCE_INFO, RUNNER_CONNECT_INFO)
 * are stripped from the child environment - the boot-config file is the
 * single source of truth for the Python runner.
 */
export function spawnRunnerPython(opts: PythonSpawnOptions): RuntimeProcessHandles {
    const pythonBin = process.env.PYTHON_BIN || "python3";

    const argv = opts.runtimeEntry
        ? [opts.runtimeEntry, opts.bootConfigPath]
        : ["-m", "runner_python", opts.bootConfigPath];

    const childEnv: NodeJS.ProcessEnv = { ...process.env };

    delete childEnv.SEQUENCE_PATH;
    delete childEnv.SEQUENCE_INFO;
    delete childEnv.RUNNER_CONNECT_INFO;

    if (opts.env) {
        Object.assign(childEnv, opts.env);
        delete childEnv.SEQUENCE_PATH;
        delete childEnv.SEQUENCE_INFO;
        delete childEnv.RUNNER_CONNECT_INFO;
    }

    childEnv.PYTHONPATH = buildPythonPath(childEnv.PYTHONPATH);

    const child = spawn(pythonBin, argv, {
        stdio: [...RUNNER_PYTHON_STDIO],
        cwd: opts.cwd,
        env: childEnv,
    });

    const stdout = child.stdout!;
    const stderr = child.stderr!;
    const stdioSlots: ReadonlyArray<unknown> = child.stdio;
    const control = stdioSlots[4] as Duplex;
    const monitoring = stdioSlots[5] as Duplex;

    return { child, stdout, stderr, control, monitoring };
}

/** RuntimeExecutor instance for the `python3` runtime kind. */
export const pythonExecutor: RuntimeExecutor<PythonSpawnOptions> = {
    kind: "python3",
    spawn: spawnRunnerPython,
};
