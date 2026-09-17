const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve } = require("node:path");

function createGithubReleaseTrainAdapters({
    repository = "scramjetorg/transform-hub",
    githubToken = process.env.GH_TOKEN,
    runner = execFileSync,
    lockPath = ".github/release-train-lock.json",
    alignment = require("../release-align")
} = {}) {
    const command = (program, args, options = {}) =>
        runner(program, args, { encoding: "utf8", ...options, env: { ...process.env, ...(options.env || {}), ...(githubToken ? { GH_TOKEN: githubToken } : {}) } });
    const refs = (name) => String(command("git", ["rev-parse", name])).trim();
    const git = {
        ref: refs,
        createRef: (name, value) => {
            let current;
            try { current = String(command("git", ["ls-remote", "origin", `refs/heads/${name}`])).trim().split(/\s+/)[0]; } catch {}
            if (current) { if (current !== value) throw new Error(`ref ${name} already exists at a different commit`); return current; }
            command("git", ["update-ref", `refs/heads/${name}`, value, "0".repeat(40)]);
            command("git", ["push", "origin", `${value}:refs/heads/${name}`]);
            return value;
        },
        commit: (value) => ({
            sha: value,
            parents: String(command("git", ["show", "-s", "--format=%P", value]))
                .trim()
                .split(/\s+/)
                .filter(Boolean),
            tree: String(command("git", ["rev-parse", `${value}^{tree}`])).trim()
        }),
        developmentTopology: ({ r1, devel, lockPath = ".github/release-train-lock.json" }) => {
            const shas = String(command("git", ["rev-list", "--reverse", `${r1}..${devel}`])).trim().split(/\s+/).filter(Boolean);
            return shas.map((sha) => {
                const parents = String(command("git", ["show", "-s", "--format=%P", sha])).trim().split(/\s+/).filter(Boolean);
                const changedPaths = String(command("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", sha])).trim().split(/\s+/).filter(Boolean);
                let lockBlob;
                try { lockBlob = String(command("git", ["show", `${sha}:${lockPath}`])); } catch {}
                return { sha, parents, changedPaths, lockBlob };
            });
        },
        replay: ({ base, commits, developmentVersion }) => {
            const worktree = mkdtempSync(`${tmpdir()}/release-train-replay-`);
            try {
                command("git", ["worktree", "add", "--detach", worktree, base]);
                if (developmentVersion) command(process.execPath, [resolve(__dirname, "..", "release-align.js"), "development", `--development-version=${developmentVersion}`], { cwd: worktree, env: { SCRAMJET_RELEASE_ROOT: worktree } });
                if (commits.length) command("git", ["-C", worktree, "cherry-pick", ...commits]);
                if (developmentVersion) command(process.execPath, [resolve(__dirname, "..", "release-align.js"), "check-development", `--development-version=${developmentVersion}`], { cwd: worktree, env: { SCRAMJET_RELEASE_ROOT: worktree } });
                return String(command("git", ["-C", worktree, "rev-parse", "HEAD"])).trim();
            } finally { command("git", ["worktree", "remove", "--force", worktree]); rmSync(worktree, { recursive: true, force: true }); }
        },
        backupRef: (name, value) => {
            command("git", ["update-ref", `refs/${name}`, value]);
            return { name, value };
        },
        updateRef: (name, value, options) => { command("git", ["update-ref", `refs/heads/${name}`, value, options.expected]); command("git", ["push", "origin", `${value}:refs/heads/${name}`]); }
    };
    const lockStore = {
        read: () => (existsSync(resolve(lockPath)) ? JSON.parse(readFileSync(resolve(lockPath), "utf8")) : null),
        readLive: () => lockStore.read(),
        write: (value, options = {}) => {
            const current = lockStore.read();
            if (options.expected === null && current) throw new Error("release-train lock already exists");
            if (Number.isInteger(options.expected) && (!current || current.revision !== options.expected)) throw new Error("release-train lock lease failed");
            const temporary = `${resolve(lockPath)}.tmp`;
            writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
            renameSync(temporary, resolve(lockPath));
            command("git", ["add", lockPath]);
            command("git", ["commit", "-m", `release: update train lock ${value.status}`]);
            command("git", ["push", "origin", "HEAD:refs/heads/devel"]);
        }
    };
    const github = {
        createPromotion: ({ repository: repo, head, base }) =>
            JSON.parse(
                command("gh", [
                    "pr",
                    "create",
                    "--repo",
                    repo,
                    "--head",
                    head,
                    "--base",
                    base,
                    "--title",
                    `Release ${head}`,
                    "--body",
                    "Release train promotion",
                    "--json",
                    "number,headRefName,baseRefName"
                ])
            ),
        promotion: (number) => JSON.parse(command("gh", ["api", `repos/${repository}/pulls/${number}`])),
        findPromotion: ({ repository: repo, head, base }) => {
            const result = JSON.parse(command("gh", ["pr", "list", "--repo", repo, "--head", head, "--base", base, "--state", "all", "--json", "number,state,mergedAt,headRefOid"]));
            if (!result[0]) return null;
            return { ...result[0], headSha: result[0].headRefOid, merged: Boolean(result[0].mergedAt) };
        },
    };
    github.createPromotion = ({ repository: repo, head, base }) => {
        const existing = JSON.parse(command("gh", ["pr", "list", "--repo", repo, "--head", head, "--base", base, "--state", "open", "--json", "number,headRefName,baseRefName"]));
        if (existing[0]) return existing[0];
        return JSON.parse(command("gh", ["pr", "create", "--repo", repo, "--head", head, "--base", base, "--title", `Release ${head}`, "--body", "Release train promotion", "--json", "number,headRefName,baseRefName"]));
    };
    const align = {
        validateRelease: ({ version, branch, expected }) => {
            if (!expected) throw new Error("validateRelease requires an expected SHA");
            const worktree = mkdtempSync(`${tmpdir()}/release-train-validate-`);
            try {
                command("git", ["worktree", "add", "--detach", worktree, expected]);
                try {
                    return command(process.execPath, [resolve(__dirname, "..", "release-align.js"), "check", `--release-version=${version}`], { cwd: worktree, env: { SCRAMJET_RELEASE_ROOT: worktree } });
                } catch (error) {
                    const stdout = String(error?.stdout || "").trim();
                    const stderr = String(error?.stderr || "").trim();
                    const output = [stdout, stderr].filter(Boolean).join("\n");
                    throw new Error(`release-align check failed${output ? `:\n${output}` : ""}`, { cause: error });
                }
            } finally { command("git", ["worktree", "remove", "--force", worktree]); rmSync(worktree, { recursive: true, force: true }); }
        },
        validateDevelopment: ({ version, branch, expected }) => {
            if (!expected) throw new Error("validateDevelopment requires an expected SHA");
            const worktree = mkdtempSync(`${tmpdir()}/release-train-validate-`);
            try {
                command("git", ["worktree", "add", "--detach", worktree, expected]);
                try {
                    return command(process.execPath, [resolve(__dirname, "..", "release-align.js"), "check-development", `--development-version=${version}`], { cwd: worktree, env: { SCRAMJET_RELEASE_ROOT: worktree } });
                } catch (error) {
                    const stdout = String(error?.stdout || "").trim();
                    const stderr = String(error?.stderr || "").trim();
                    const output = [stdout, stderr].filter(Boolean).join("\n");
                    throw new Error(`release-align check failed${output ? `:\n${output}` : ""}`, { cause: error });
                }
            } finally { command("git", ["worktree", "remove", "--force", worktree]); rmSync(worktree, { recursive: true, force: true }); }
        },
        release: ({ version, branch, expected }) => {
            command("git", ["switch", "--detach", expected]);
            command("git", ["switch", "-C", branch]);
            const result = alignment.applyChanges({ releaseVersion: version });
            if (!result.ok) throw new Error(result.errors.join("; "));
            command("git", ["add", "-A"]);
            command("git", ["commit", "-m", `release: align ${version}`]);
            command("git", ["push", "origin", `HEAD:refs/heads/${branch}`]);
            return refs("HEAD");
        },
        development: ({ version, branch = "devel", expected }) => {
            command("git", ["switch", "--detach", expected]);
            command("git", ["switch", "-C", branch]);
            const result = alignment.applyDevelopmentChanges({ developmentVersion: version });
            if (!result.ok) throw new Error(result.errors.join("; "));
            command("git", ["add", "-A"]);
            command("git", ["commit", "-m", `release: align ${version}`]);
            command("git", ["push", "origin", `HEAD:refs/heads/${branch}`]);
            return refs("HEAD");
        }
    };
    const reservation = {
        readMarker: (identity) => {
            try {
                const markerRef = `refs/tags/release-train-start.v1/${identity.stableVersion}/${identity.nextDevelopmentVersion}`;
                const anchor = String(command("git", ["rev-parse", "--verify", "--quiet", `${markerRef}^{}`])).trim();
                const subject = String(command("git", ["for-each-ref", "--format=%(contents:subject)", markerRef])).trim();
                if (!anchor || !subject) return null;
                return { ...JSON.parse(subject), anchor };
            } catch { return null; }
        },
        createMarker: (marker) => {
            const markerRef = `refs/tags/release-train-start.v1/${marker.stableVersion}/${marker.nextDevelopmentVersion}`;
            const existing = reservation.readMarker(marker);
            if (existing) { if (JSON.stringify(existing) !== JSON.stringify(marker)) throw new Error("release-train start marker already exists with different identity"); return existing; }
            try {
                const remote = String(command("git", ["ls-remote", "origin", markerRef])).trim();
                if (remote) throw new Error("release-train start marker already exists remotely");
            } catch (error) {
                if (/already exists remotely/.test(error.message)) throw error;
            }
            command("git", ["tag", "-a", markerRef.slice("refs/tags/".length), marker.anchor, "-m", JSON.stringify(marker)]);
            command("git", ["push", "origin", markerRef]);
            return marker;
        },
        isReserved: (version) => {
            try { command("git", ["ls-remote", "--exit-code", "origin", `refs/heads/release/${version}`]); return true; } catch {}
            try { command("gh", ["release", "view", `v${version}`, "--repo", repository]); return true; } catch { return false; }
        },
        reserve: () => {}
    };
    return { git, lockStore, reservation, github, align };
}

module.exports = { createGithubReleaseTrainAdapters };
