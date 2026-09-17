const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { assertSha, assertDigest } = require("../release-contract");

function json(value) { try { return JSON.parse(String(value)); } catch { throw new Error("gh returned invalid JSON."); } }
function stored(name) { if (typeof name !== "string" || !/^[^/\\][^/\\]*(?:\/[^/\\][^/\\]*)*$/.test(name)) throw new Error("Final release asset name is invalid."); return name.replaceAll("/", "__"); }
function logical(name) { return name.startsWith("artifacts__") ? `artifacts/${name.slice(11)}` : name; }

function createGithubReleaseFinalizerAdapter({ repository, runner = execFileSync }) {
    if (typeof repository !== "string" || !repository) throw new Error("GitHub repository is required.");
    const command = (args, options = {}) => runner("gh", args, { encoding: "utf8", ...options });
    const view = (tag) => {
        try { return json(command(["release", "view", tag, "--repo", repository, "--json", "databaseId,isDraft,tagName,targetCommitish,assets"])); }
        catch (error) { if (error?.status === 404 || /release not found|404/i.test(`${error?.stderr || ""}`)) return null; throw error; }
    };
    const releaseId = (release) => Number(release?.databaseId || release?.id);
    return {
        reservation(input) {
            assertSha(input.mainSha, "finalization main SHA");
            assertDigest(input.releaseSetDigest, "finalization release-set digest");
            const existing = view(input.finalTag);
            let release = existing;
            if (!release) {
                command(["release", "create", input.finalTag, "--repo", repository, "--target", input.mainSha, "--draft", "--title", input.version, "--notes", ""]);
                release = view(input.finalTag);
            }
            if (!release || release.isDraft !== true || release.tagName !== input.finalTag || (release.targetCommitish && release.targetCommitish !== input.mainSha)) throw new Error("Final GitHub release conflicts with the requested reservation.");
            const id = releaseId(release);
            if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Final GitHub release has no numeric ID.");
            const names = (release.assets || []).map((asset) => logical(asset.name));
            if (names.includes("finalization-reservation.json")) {
                const actual = JSON.parse(this.download(id, "finalization-reservation.json").toString("utf8"));
                if (JSON.stringify(actual) !== JSON.stringify(input)) throw new Error("Final release reservation conflicts with the requested reservation.");
            } else if (existing) throw new Error("Existing final draft has no matching immutable reservation.");
            else this.append(id, "finalization-reservation.json", Buffer.from(`${JSON.stringify(input, null, 2)}\n`));
            return { releaseId: id, finalTag: input.finalTag, reused: Boolean(existing) };
        },
        read(releaseIdInput) {
            const id = Number(releaseIdInput); if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Release ID must be positive.");
            return json(command(["api", `repos/${repository}/releases/${id}`]));
        },
        list(releaseIdInput) {
            const release = this.read(releaseIdInput);
            return (release.assets || []).map((asset) => logical(asset.name));
        },
        download(releaseIdInput, name) {
            const release = this.read(releaseIdInput);
            const remote = (release.assets || []).find((asset) => logical(asset.name) === name);
            if (!remote) throw new Error(`Final release asset is missing: ${name}`);
            const dir = mkdtempSync(join(tmpdir(), "release-final-download-"));
            try { command(["release", "download", release.tag_name, "--repo", repository, "--pattern", remote.name, "--dir", dir, "--clobber"]); return readFileSync(join(dir, remote.name)); }
            finally { rmSync(dir, { recursive: true, force: true }); }
        },
        append(releaseIdInput, name, bytes) {
            if (this.list(releaseIdInput).includes(name)) throw new Error(`Final release asset already exists: ${name}`);
            const release = this.read(releaseIdInput); const dir = mkdtempSync(join(tmpdir(), "release-final-upload-"));
            try { const file = join(dir, stored(name)); writeFileSync(file, bytes, { flag: "wx" }); command(["release", "upload", release.tag_name, "--repo", repository, `${file}#${stored(name)}`]); }
            finally { rmSync(dir, { recursive: true, force: true }); }
            return { name };
        },
        publish(releaseIdInput) { const release = this.read(releaseIdInput); command(["release", "edit", release.tag_name, "--repo", repository, "--draft=false"]); return { published: true }; },
    };
}

module.exports = { createGithubReleaseFinalizerAdapter };
