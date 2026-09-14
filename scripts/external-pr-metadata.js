const SHA = /^[a-f0-9]{40}$/i;

function validateExternalPrMetadata(metadata, { expectedHeadSha, expectedBaseSha, expectedBaseRef, expectedBaseRepository, organization = "scramjetorg" } = {}) {
    if (!metadata || metadata.state !== "open") throw new Error("External PR must be open.");
    if (typeof expectedHeadSha !== "string" || !SHA.test(expectedHeadSha)) throw new Error("A full expected head SHA is required.");
    if (typeof expectedBaseSha !== "string" || !SHA.test(expectedBaseSha)) throw new Error("A full expected base SHA is required.");
    if (typeof expectedBaseRef !== "string" || !expectedBaseRef) throw new Error("An expected base ref is required.");
    if (typeof expectedBaseRepository !== "string" || !expectedBaseRepository) throw new Error("An expected base repository is required.");
    if (metadata.head?.sha !== expectedHeadSha) throw new Error("External PR head SHA changed or does not match the expected SHA.");
    const owner = metadata.head?.repo?.owner?.login || metadata.head?.repo?.owner?.name;
    if (!owner || owner.toLowerCase() === organization.toLowerCase()) throw new Error("PR head must belong to an external repository owner.");
    if (!metadata.head?.repo?.full_name) throw new Error("External PR head repository is missing.");
    const baseRepository = metadata.base?.repo?.full_name;
    const baseSha = metadata.base?.sha;
    const baseRef = metadata.base?.ref;
    if (!baseRepository || !baseSha || !baseRef) throw new Error("External PR base repository, SHA, and ref are required.");
    if (baseRepository !== expectedBaseRepository) throw new Error("External PR base repository changed or does not match the expected repository.");
    if (baseSha !== expectedBaseSha) throw new Error("External PR base SHA changed or does not match the expected SHA.");
    if (baseRef !== expectedBaseRef) throw new Error("External PR base ref changed or does not match the expected ref.");
    return { headRepository: metadata.head.repo.full_name, headSha: metadata.head.sha, owner, baseRepository, baseSha, baseRef };
}

module.exports = { validateExternalPrMetadata };
