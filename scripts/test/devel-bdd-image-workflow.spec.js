"use strict";

const test = require("ava").default;
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const { checkWorkflowSource } = require("../check-workflow-policy.js");

const workflowPath = resolve(__dirname, "..", "..", ".github", "workflows", "devel-bdd-image.yml");

test("devel BDD image publication is a trusted, source-SHA-addressed GHCR publisher", (t) => {
	const source = readFileSync(workflowPath, "utf8");
	t.deepEqual(checkWorkflowSource(source, ".github/workflows/devel-bdd-image.yml"), []);
	t.true(source.includes("branches: [devel]"));
	t.true(source.includes("group: devel-bdd-node-image-${{ github.sha }}"));
	t.true(source.includes("cancel-in-progress: false"));
	t.true(source.includes("github.repository == 'scramjetorg/transform-hub'"));
	t.true(source.includes("github.ref == 'refs/heads/devel'"));
	t.true(source.includes("packages: write"));
	t.true(source.includes("contents: read"));
	t.true(source.includes("persist-credentials: false"));
	t.true(source.includes("ref: ${{ github.sha }}"));
	t.true(source.includes("attestations: write"));
	t.true(source.includes("id-token: write"));
	t.true(source.includes("steps.source.outputs.sha"));
	t.true(source.includes("docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83"));
	t.regex(source, /actions\/attest-build-provenance@[a-f0-9]{40}/);
	t.true(source.includes("subject-name: ghcr.io/scramjetorg/transform-hub/bdd-node"));
	t.true(source.includes("subject-digest: ${{ steps.build.outputs.digest }}"));
	t.true(source.includes("push-to-registry: true"));
	t.true(source.includes("tags: ghcr.io/scramjetorg/transform-hub/bdd-node:devel-${{ steps.source.outputs.sha }}"));
	t.true(source.includes("docker/Dockerfile.bdd-bun"));
	t.true(source.includes("provenance: mode=max"));
	t.true(source.includes("sbom: true"));
	t.true(source.includes("platforms: linux/amd64"));
	t.true(source.includes("push: true"));
	t.true(source.includes("$BDD_IMAGE_REPOSITORY@$BDD_IMAGE_DIGEST"));
	t.true(source.includes("GITHUB_TOKEN: ${{ github.token }}"));
	t.true(source.includes("if: ${{ always() }}"));
	t.true(source.includes("run: docker logout ghcr.io"));
	t.false(source.includes("${{ secrets."));
	t.false(source.includes("docker/login-action"));
});
