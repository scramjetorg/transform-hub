// @TODO this type should allow for differentiating easily between success and error
// like { type: 'success', payload: { id: string } } | { type: 'error', code: number, message: string }

export type SendSequenceResponse =
| { id: string }
| { opStatus: number, error: unknown }
