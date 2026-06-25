export type OpResponse<PayloadType extends Record<string, unknown>> =
| (PayloadType & { opStatus: string })
| { opStatus: string, error?: unknown }

export type ControlMessageResponse = {
    accepted: string,
}
