const SHA = /^[a-f0-9]{40}$/i;

function validateExternalPrMetadata(metadata, { expectedHeadSha, organization = "scramjetorg" } = {}) {
    if (!metadata || metadata.state !== "open") throw new Error("External PR must be open.");
    if (typeof expectedHeadSha !== "string" || !SHA.test(expectedHeadSha)) throw new Error("A full expected head SHA is required.");
    if (metadata.head?.sha !== expectedHeadSha) throw new Error("External PR head SHA changed or does not match the expected SHA.");
    const owner = metadata.head?.repo?.owner?.login || metadata.head?.repo?.owner?.name;
    if (!owner || owner.toLowerCase() === organization.toLowerCase()) throw new Error("PR head must belong to an external repository owner.");
    if (!metadata.head?.repo?.full_name) throw new Error("External PR head repository is missing.");
    return { headRepository: metadata.head.repo.full_name, headSha: metadata.head.sha, owner };
}

module.exports = { validateExternalPrMetadata };
