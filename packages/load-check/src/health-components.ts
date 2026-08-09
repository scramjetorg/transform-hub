import { cpus, freemem, loadavg, totalmem } from "os";
import _du from "diskusage-ng";
import { promisify } from "util";

const du = promisify(_du);

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthComponent<TScope = unknown> = {
    name: string;
    healthy: boolean;
    status: HealthStatus;
    scope?: TScope;
    details?: unknown;
};

export type DefaultHealthComponentOptions<TScope = unknown> = {
    current: {
        name: string;
        healthy: boolean;
        scope?: TScope;
        details?: unknown;
    };
    processMemoryLimitBytes?: number;
    processMemoryFreeRatio?: number;
    processCpuMaxPercent?: number;
    osMemoryAvailableRatio?: number;
    osLoadMaxCpuRatio?: number;
    osDiskFreeRatio?: number;
    osDiskPaths?: string[];
    extraComponents?: HealthComponent[];
};

export type HealthSummary<TScope = unknown, TComponent = HealthComponent> = {
    scope?: TScope;
    healthy: boolean;
    status: HealthStatus;
    components: TComponent[];
    details?: unknown;
};

export function summarizeHealth<TScope, TComponent extends HealthComponent>(
    scope: TScope,
    components: TComponent[],
    details?: unknown
): HealthSummary<TScope, TComponent> {
    const hasUnhealthy = components.some(component => component.status === "unhealthy");
    const hasDegraded = components.some(component => component.status === "degraded");

    let status: HealthStatus = "healthy";

    if (hasUnhealthy) {
        status = "unhealthy";
    } else if (hasDegraded) {
        status = "degraded";
    }

    return {
        scope,
        healthy: components.every(component => component.healthy),
        status,
        components,
        details
    };
}

export function currentComponent<TScope>(current: DefaultHealthComponentOptions<TScope>["current"]): HealthComponent<TScope> {
    return {
        name: current.name,
        healthy: current.healthy,
        status: current.healthy ? "healthy" : "unhealthy",
        scope: current.scope,
        details: current.details
    };
}

export function degradedComponent(name: string, degraded: boolean, details?: unknown): HealthComponent {
    return {
        name,
        healthy: true,
        status: degraded ? "degraded" : "healthy",
        details
    };
}

function processMemoryComponent(options: DefaultHealthComponentOptions): HealthComponent {
    const memory = process.memoryUsage();
    const limit = options.processMemoryLimitBytes || totalmem();
    const freeRatio = Math.max(0, limit - memory.rss) / limit;
    const threshold = options.processMemoryFreeRatio ?? 0.2;

    return degradedComponent("process.memory", freeRatio < threshold, { rss: memory.rss, limit, freeRatio, threshold });
}

function processCpuComponent(options: DefaultHealthComponentOptions): HealthComponent {
    const cpu = process.cpuUsage();
    const cpuCount = Math.max(1, cpus().length);
    const elapsedMicros = Math.max(1, process.uptime() * 1_000_000 * cpuCount);
    const percent = (cpu.user + cpu.system) / elapsedMicros * 100;
    const threshold = options.processCpuMaxPercent ?? 80;

    return degradedComponent("process.cpu", percent > threshold, { percent, threshold });
}

function osMemoryComponent(options: DefaultHealthComponentOptions): HealthComponent {
    const available = freemem();
    const total = totalmem();
    const availableRatio = available / total;
    const threshold = options.osMemoryAvailableRatio ?? 0.3;

    return degradedComponent("os.memory", availableRatio < threshold, { available, total, availableRatio, threshold });
}

function osLoadComponent(options: DefaultHealthComponentOptions): HealthComponent {
    const [oneMinuteLoad = 0] = loadavg();
    const cpuCount = Math.max(1, cpus().length);
    const threshold = cpuCount * (options.osLoadMaxCpuRatio ?? 1);

    return degradedComponent("os.load", oneMinuteLoad >= threshold, { oneMinuteLoad, cpuCount, threshold });
}

async function osDiskComponents(options: DefaultHealthComponentOptions): Promise<HealthComponent[]> {
    const paths = [...new Set(options.osDiskPaths || [process.cwd()])];
    const threshold = options.osDiskFreeRatio ?? 0.05;

    return Promise.all(paths.map(async path => {
        try {
            const usage = await du(path);
            const freeRatio = usage.available / usage.total;

            return degradedComponent("os.disk", freeRatio < threshold, { path, available: usage.available, total: usage.total, freeRatio, threshold });
        } catch (error) {
            return degradedComponent("os.disk", true, { path, error: error instanceof Error ? error.message : String(error) });
        }
    }));
}

export async function createDefaultHealthComponents<TScope = unknown>(options: DefaultHealthComponentOptions<TScope>): Promise<HealthComponent[]> {
    const diskComponents = await osDiskComponents(options);
    const extraComponents = options.extraComponents || [];

    return [
        currentComponent(options.current),
        processMemoryComponent(options),
        processCpuComponent(options),
        osMemoryComponent(options),
        osLoadComponent(options),
        ...diskComponents,
        ...extraComponents
    ];
}
