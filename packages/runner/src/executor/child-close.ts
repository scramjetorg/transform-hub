export type ChildClose = {
    code: number | null;
    signal: NodeJS.Signals | null;
};

export type ConnectionOutcome<T> =
    | { status: "fulfilled"; value: T }
    | { status: "rejected"; reason: unknown };

type ChildCloseSource = {
    once(event: "close", listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
};

/** Register the close listener at call time, before startup can await. */
export function waitForChildClose(child: ChildCloseSource): Promise<ChildClose> {
    return new Promise(resolve => {
        child.once("close", (code: number | null, signal: NodeJS.Signals | null) => {
            resolve({ code, signal });
        });
    });
}

/**
 * Keep child finalization behind both startup and the already-registered close
 * event. This also consumes a rejected startup attempt so it cannot race a
 * close handler into a second cleanup path.
 */
export async function waitForChildCloseAndConnection<T>(
    childClose: Promise<ChildClose>,
    connection: Promise<T>
): Promise<{ close: ChildClose; connection: ConnectionOutcome<T> }> {
    const connectionOutcome: Promise<ConnectionOutcome<T>> = connection.then(
        value => ({ status: "fulfilled", value } as ConnectionOutcome<T>),
        reason => Promise.resolve({ status: "rejected", reason } as ConnectionOutcome<T>)
    );

    const [close, connectionResult] = await Promise.all([childClose, connectionOutcome]);
    return { close, connection: connectionResult };
}
