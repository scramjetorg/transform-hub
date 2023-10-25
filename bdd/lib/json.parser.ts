export function extractJsonFromSiSeqDeploy(data: any) {
    const lines = data.split("\n");

    const seqInfo = JSON.parse(lines[0]);
    const instInfo = JSON.parse(lines[1]);

    return {
        sequenceId: seqInfo._id,
        instanceId: instInfo._id
    };
}

export function extractKillResponseFromSiInstRestart(data: any) {
    const lines = data.split("\n");
    const killResponse = JSON.parse(lines[0]).killResponse;

    return killResponse;
}
