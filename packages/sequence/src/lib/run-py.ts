import { PassThrough } from "stream";

function getPassThrough() {
    const pt = new PassThrough();

    pt.end();
    return pt;
}

export async function runSequence(input = getPassThrough(), ...argv: String[]) {

}

