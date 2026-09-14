"use strict";
const { assertDigest } = require("../release-contract");
const CANDIDATE_RUNTIME_IMAGE_ROLES = ["bdd-node", "runner-node", "runner-python", "runner-bun", "pre-runner"];
const CANDIDATE_RUNTIME_IMAGE_REPOSITORIES = Object.freeze({
    "bdd-node": "ghcr.io/scramjetorg/transform-hub/bdd-node",
    "runner-node": "ghcr.io/scramjetorg/transform-hub/runner",
    "runner-python": "ghcr.io/scramjetorg/transform-hub/runner-py",
    "runner-bun": "ghcr.io/scramjetorg/transform-hub/runner-bun",
    "pre-runner": "ghcr.io/scramjetorg/transform-hub/pre-runner"
});
function validateCandidateRuntimeImages(images) {
    if (!Array.isArray(images) || images.length !== CANDIDATE_RUNTIME_IMAGE_ROLES.length) throw new Error("Candidate runtime image closure must contain exactly the required roles.");
    const seen = new Set(); const result = {};
    for (const image of images) {
        if (!image || !CANDIDATE_RUNTIME_IMAGE_ROLES.includes(image.role) || seen.has(image.role)) throw new Error("Candidate runtime image roles must be complete and unique.");
        if (image.repository !== CANDIDATE_RUNTIME_IMAGE_REPOSITORIES[image.role]) throw new Error(`Candidate runtime image repository is not permitted for role ${image.role}.`);
        result[image.role] = { repository: image.repository, digest: assertDigest(image.digest, `candidate ${image.role} image digest`) }; seen.add(image.role);
    }
    if (seen.size !== CANDIDATE_RUNTIME_IMAGE_ROLES.length) throw new Error("Candidate runtime image closure is incomplete.");
    return Object.fromEntries(CANDIDATE_RUNTIME_IMAGE_ROLES.map(role => [role, result[role]]));
}
function imageMapReferences(imageMap) { return Object.fromEntries(CANDIDATE_RUNTIME_IMAGE_ROLES.map(role => [role, `${imageMap[role].repository}@${imageMap[role].digest}`])); }
module.exports = { CANDIDATE_RUNTIME_IMAGE_ROLES, CANDIDATE_RUNTIME_IMAGE_REPOSITORIES, validateCandidateRuntimeImages, imageMapReferences };
