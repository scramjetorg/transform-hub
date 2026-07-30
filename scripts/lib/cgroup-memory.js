const fs = require("fs");

function readNumber(filePath) {
    try {
        const value = Number(fs.readFileSync(filePath, "utf8").trim());
        return Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

function readInactiveFile(statPath) {
    try {
        const lines = fs.readFileSync(statPath, "utf8").split("\n");
        // Prefer total_inactive_file (hierarchical, cgroup v1) over inactive_file.
        // On cgroup v1 both keys may exist; on cgroup v2 only inactive_file exists.
        const line = lines.find((entry) => /^total_inactive_file\s+/.test(entry)) || lines.find((entry) => /^inactive_file\s+/.test(entry));
        if (!line) return null;
        const value = Number(line.trim().split(/\s+/)[1]);
        return Number.isFinite(value) && value >= 0 ? value : null;
    } catch {
        return null;
    }
}

function parseCgroupWorkingSet({ current, stat, source }) {
    if (!Number.isFinite(current) || current < 0 || !Number.isFinite(stat) || stat < 0) {
        return { bytes: null, source: `${source}-invalid` };
    }
    const bytes = current - stat;
    return bytes >= 0 ? { bytes, source } : { bytes: null, source: `${source}-invalid` };
}

/** Return cgroup working set: current/usage minus inactive file pages. */
function readCgroupWorkingSetBytes() {
    const v2Current = readNumber("/sys/fs/cgroup/memory.current");
    if (v2Current !== null) {
        return parseCgroupWorkingSet({ current: v2Current, stat: readInactiveFile("/sys/fs/cgroup/memory.stat"), source: "cgroup-v2" });
    }

    const v1Usage = readNumber("/sys/fs/cgroup/memory/memory.usage_in_bytes");
    if (v1Usage !== null) {
        return parseCgroupWorkingSet({ current: v1Usage, stat: readInactiveFile("/sys/fs/cgroup/memory/memory.stat"), source: "cgroup-v1" });
    }

    return { bytes: null, source: "unavailable" };
}

module.exports = { parseCgroupWorkingSet, readCgroupWorkingSetBytes, readInactiveFile };
