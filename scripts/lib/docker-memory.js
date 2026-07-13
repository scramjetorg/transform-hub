"use strict";

const http = require("node:http");

function parseDockerStatsWorkingSet(payload) {
    const stats = typeof payload === "string" ? JSON.parse(payload) : payload;
    const memory = stats?.memory_stats;
    if (!memory || typeof memory.usage !== "number") return null;
    const inactive =
        typeof memory.stats?.inactive_file === "number" ? memory.stats.inactive_file : typeof memory.stats?.total_inactive_file === "number" ? memory.stats.total_inactive_file : 0;
    return Math.max(0, memory.usage - inactive);
}

function requestDockerStats(containerId, socketPath = "/var/run/docker.sock", timeoutMs = 10000) {
    return new Promise((resolve) => {
        const request = http.request(
            { socketPath, path: `/containers/${encodeURIComponent(containerId)}/stats?stream=false&one-shot=true`, method: "GET", timeout: timeoutMs },
            (response) => {
                let body = "";
                response.setEncoding("utf8");
                response.on("data", (chunk) => {
                    body += chunk;
                });
                response.on("end", () => {
                    if ((response.statusCode || 500) >= 400 || !body) return resolve(null);
                    try {
                        resolve(parseDockerStatsWorkingSet(body));
                    } catch {
                        resolve(null);
                    }
                });
            }
        );
        request.on("timeout", () => {
            request.destroy();
            resolve(null);
        });
        request.on("error", () => resolve(null));
        request.end();
    });
}

module.exports = { parseDockerStatsWorkingSet, requestDockerStats };
