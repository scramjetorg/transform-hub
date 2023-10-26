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

export function extractInstanceFromSiInstLs(data: any, instanceId: string) {
    const lines = data.split("\n");
    const json = JSON.parse(lines[0]);
    let instance: any = null;

    if (json.length > 0) {
        for (let i = 0; i < json.length; i++) {
            const obj = json[i];
            const id: string = obj.id;

            if (id.localeCompare(instanceId) === 0) {
                instance = obj;
                break;
            }
        }
    }
    return instance;
}
