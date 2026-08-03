export function normalizeRpcForwardPath(rpcPath: string, exposePath?: string, apiVersion?: string): string {
    const normalizedRpcPath = rpcPath.startsWith("/") ? rpcPath : `/${rpcPath}`;

    if (
        apiVersion === "v1" &&
        exposePath?.startsWith("/api/v1") &&
        !normalizedRpcPath.startsWith("/api/v1")
    ) {
        return `/api/v1${normalizedRpcPath}`;
    }

    return normalizedRpcPath;
}

export function matchesRpcExposePath(rpcPath: string, exposePath?: string): boolean {
    if (!exposePath) {
        return false;
    }

    const normalizedRpcPath = rpcPath.startsWith("/") ? rpcPath : `/${rpcPath}`;

    if (exposePath === "/") {
        return normalizedRpcPath.startsWith("/");
    }

    if (!normalizedRpcPath.startsWith(exposePath)) {
        return false;
    }

    const next = normalizedRpcPath[exposePath.length];

    return next === undefined || next === "/" || next === "?" || next === "#";
}

export function stripRpcExposePath(rpcPath: string, exposePath?: string): string {
    const normalizedRpcPath = rpcPath.startsWith("/") ? rpcPath : `/${rpcPath}`;

    if (exposePath === "/") {
        return normalizedRpcPath || "/";
    }

    if (exposePath && matchesRpcExposePath(normalizedRpcPath, exposePath)) {
        const stripped = normalizedRpcPath.slice(exposePath.length) || "/";

        return stripped.startsWith("?") ? `/${stripped}` : stripped;
    }

    return normalizedRpcPath || "/";
}
