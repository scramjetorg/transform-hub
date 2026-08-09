export function bddBootExitTimeout(): number | undefined {
    return process.env.SCRAMJET_BDD_RUN_ID ? 1000 : undefined;
}
