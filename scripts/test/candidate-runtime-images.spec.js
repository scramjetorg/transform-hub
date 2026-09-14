"use strict";
const test = require("ava").default;
const { CANDIDATE_RUNTIME_IMAGE_ROLES, CANDIDATE_RUNTIME_IMAGE_REPOSITORIES, validateCandidateRuntimeImages } = require("../lib/candidate-runtime-images");
const digest = role => ({ role, repository: CANDIDATE_RUNTIME_IMAGE_REPOSITORIES[role], digest: `sha256:${String(CANDIDATE_RUNTIME_IMAGE_ROLES.indexOf(role) + 1).padStart(64, "0")}` });

test("candidate runtime image closure requires the complete unique permitted role set", t => {
    const images = CANDIDATE_RUNTIME_IMAGE_ROLES.map(digest);
    t.deepEqual(Object.keys(validateCandidateRuntimeImages(images)), CANDIDATE_RUNTIME_IMAGE_ROLES);
    t.throws(() => validateCandidateRuntimeImages(images.slice(1)), { message: /exactly the required roles/ });
    t.throws(() => validateCandidateRuntimeImages([...images.slice(0, -1), digest("bdd-node")]), { message: /complete and unique/ });
    t.throws(() => validateCandidateRuntimeImages(images.map(image => image.role === "runner-node" ? { ...image, repository: "ghcr.io/attacker/runner" } : image)), { message: /not permitted/ });
});
